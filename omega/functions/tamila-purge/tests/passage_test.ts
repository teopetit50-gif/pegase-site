// deno-lint-ignore-file require-await
// Le passage de tamila-purge avec des portes et un bucket en mémoire. Aucun appel réseau.

import { assertEquals } from "@std/assert";
import { GENRE, GENRE_CLE, GENRE_DOSSIER, GENRE_EXPORT, passage } from "../passage.ts";
import { type DossierAEffacer, ErreurPorte, type Portes, type Travail } from "../portes.ts";
import { type Stockage, StockageSupabase } from "../stockage.ts";

const CLIENT = "cccccccc-0000-4000-8000-00000000000c";

class PortesMemoire implements Portes {
  travaux: Travail[] = [];
  chemins = new Map<number, string[]>();
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  purgees: { reception: number; fichiers: number }[] = [];
  battements = 0;
  async prendreTravaux(genres: string[]) {
    const pris = this.travaux.filter((t) => genres.includes(t.genre));
    this.travaux = [];
    return pris;
  }
  async finirTravail(id: number, resultat: unknown) {
    this.finis.push({ id, resultat });
  }
  async echouerTravail(id: number, erreur: string, reprendre: boolean) {
    this.echoues.push({ id, erreur, reprendre });
    return reprendre ? "repris" : "echec";
  }
  async battreOuvrier() {
    this.battements++;
    return 1;
  }
  async aPurger(reception: number) {
    const c = this.chemins.get(reception);
    if (!c) throw new ErreurPorte("55000", "Aucune purge demandée pour cette réception.", false);
    return { reception, client: CLIENT, chemins: c };
  }
  async purgee(reception: number, fichiers: number) {
    this.purgees.push({ reception, fichiers });
  }
  /* b4_11 : la base tient la liste des fichiers d'un dossier et refuse tant qu'il en reste au bucket */
  bucket: BucketMemoire | null = null;
  echus = new Set<string>();
  effaces = new Set<string>();
  exports = new Map<string, string>();
  exportsPurges: string[] = [];
  clesDetruites: string[] = [];
  async dossierAEffacer(dossier: string): Promise<DossierAEffacer> {
    if (!this.echus.has(dossier)) throw new ErreurPorte("55000", "L'échéance de l'effacement n'est pas atteinte.", false);
    const prefixe = `${CLIENT}/tamila_dossier/${dossier}/`;
    const fichiers = [...(this.bucket?.fichiers ?? [])].filter((f) => f.startsWith(prefixe)).map((nom) => ({ bucket: "omega-clients", nom }));
    return { dossier, client: CLIENT, deja_efface: this.effaces.has(dossier), fichiers };
  }
  async effacerDossierVerifie(dossier: string) {
    const restants = [...(this.bucket?.fichiers ?? [])].filter((f) => f.startsWith(`${CLIENT}/tamila_dossier/${dossier}/`)).length;
    if (restants) throw new ErreurPorte("55000", `Des fichiers du dossier sont encore au stockage (${restants}).`, false);
    const deja = this.effaces.has(dossier);
    this.effaces.add(dossier);
    return { dossier, deja_efface: deja, fichiers_restants: 0 };
  }
  async exportPurge(exportId: string) {
    const chemin = this.exports.get(exportId);
    if (chemin && this.bucket?.fichiers.has(chemin)) throw new ErreurPorte("55000", "Le fichier de l'archive est encore au coffre.", false);
    this.exportsPurges.push(exportId);
  }
  async cleDetruite(dossier: string) {
    this.clesDetruites.push(dossier);
  }
}

class BucketMemoire implements Stockage {
  fichiers = new Set<string>();
  panne = false;
  /* un fichier qui résiste (droits, verrou) : il reste au bucket */
  tenace: string | null = null;
  async effacer(chemins: string[]) {
    if (this.panne) throw new Error("Storage 503");
    let n = 0;
    for (const c of chemins) if (c !== this.tenace && this.fichiers.delete(c)) n++;
    return n;
  }
}

const travail = (id: number, reception: unknown): Travail => ({ id, client_id: CLIENT, genre: GENRE, charge: { reception }, essais: 0, essais_max: 5 });

Deno.test("passage : efface les pièces de la réception, constate la purge, finit le travail, bat", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  b.fichiers.add(`${CLIENT}/receptions/m1/avis.pdf`);
  b.fichiers.add(`${CLIENT}/receptions/m1/annexe.pdf`);
  b.fichiers.add(`${CLIENT}/tamila_dossier/d/autre.chiffre`);
  p.chemins.set(41, [`${CLIENT}/receptions/m1/avis.pdf`, `${CLIENT}/receptions/m1/annexe.pdf`]);
  p.travaux = [travail(1, 41)];
  const bilan = await passage(p, b);
  assertEquals(bilan, { pris: 1, purges: 1, dossiers: 0, exports: 0, cles: 0, fichiers: 2, echecs: 0 });
  assertEquals([...b.fichiers], [`${CLIENT}/tamila_dossier/d/autre.chiffre`], "seule la copie en clair est effacée");
  assertEquals(p.purgees, [{ reception: 41, fichiers: 2 }]);
  assertEquals(p.finis, [{ id: 1, resultat: { reception: 41, fichiers: 2 } }]);
  assertEquals(p.battements, 1);
});

Deno.test("passage : jamais rien hors de <client>/receptions/, même si la porte le demandait", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  b.fichiers.add(`${CLIENT}/tamila_dossier/d/piece.chiffre`);
  p.chemins.set(42, [`${CLIENT}/tamila_dossier/d/piece.chiffre`, `${CLIENT}/receptions/../tamila_dossier/d/piece.chiffre`]);
  p.travaux = [travail(2, 42)];
  await passage(p, b);
  assertEquals(b.fichiers.size, 1);
});

Deno.test("passage : rien à purger (55000) ne se reprend ; une panne du bucket se reprend ; une charge vide est ignorée", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  p.chemins.set(44, [`${CLIENT}/receptions/m4/a.pdf`]);
  p.travaux = [travail(3, 43), travail(4, "x")];
  await passage(p, b);
  assertEquals(p.echoues.map((e) => [e.id, e.reprendre]), [[3, false]]);
  assertEquals(p.finis.map((f) => f.id), [4]);
  b.panne = true;
  p.travaux = [travail(5, 44)];
  await passage(p, b);
  assertEquals(p.echoues.at(-1)!.reprendre, true);
  assertEquals(p.purgees.length, 0, "pas de purge constatée si le bucket n'a rien effacé");
});

const D1 = "d1d1d1d1-0000-4000-8000-000000000001";
const D2 = "d2d2d2d2-0000-4000-8000-000000000002";
const tache = (id: number, genre: string, charge: Record<string, unknown>): Travail => ({ id, client_id: CLIENT, genre, charge, essais: 0, essais_max: 5 });

Deno.test("dossier échu : ses fichiers sont effacés, puis la base constate et pose la preuve ; le dossier voisin ne bouge pas", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  p.bucket = b;
  p.echus.add(D1);
  b.fichiers.add(`${CLIENT}/tamila_dossier/${D1}/conclusions.pdf.abc.chiffre`);
  b.fichiers.add(`${CLIENT}/tamila_dossier/${D1}/avis.pdf.def.chiffre`);
  b.fichiers.add(`${CLIENT}/tamila_dossier/${D2}/voisin.chiffre`);
  p.travaux = [tache(10, GENRE_DOSSIER, { dossier: D1 })];
  const bilan = await passage(p, b);
  assertEquals(bilan.dossiers, 1);
  assertEquals(bilan.fichiers, 2);
  assertEquals([...b.fichiers], [`${CLIENT}/tamila_dossier/${D2}/voisin.chiffre`]);
  assertEquals(p.effaces.has(D1), true, "la preuve est posée");
  assertEquals(p.finis, [{ id: 10, resultat: { dossier: D1, fichiers: 2, deja_efface: false } }]);
});

Deno.test("dossier : avant l'échéance rien ne part (non repris) ; un fichier qui résiste laisse le dossier intact et le travail repris", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  p.bucket = b;
  b.fichiers.add(`${CLIENT}/tamila_dossier/${D1}/a.chiffre`);
  p.travaux = [tache(11, GENRE_DOSSIER, { dossier: D1 })];
  await passage(p, b);
  assertEquals(p.echoues.map((e) => [e.id, e.reprendre]), [[11, false]]);
  assertEquals(b.fichiers.size, 1, "pas un fichier effacé avant l'échéance");
  p.echus.add(D1);
  b.fichiers.add(`${CLIENT}/tamila_dossier/${D1}/b.chiffre`);
  b.tenace = `${CLIENT}/tamila_dossier/${D1}/b.chiffre`;
  p.travaux = [tache(12, GENRE_DOSSIER, { dossier: D1 })];
  await passage(p, b);
  assertEquals(p.echoues.at(-1), { id: 12, erreur: "Des fichiers du dossier sont encore au stockage (1).", reprendre: true });
  assertEquals(p.effaces.has(D1), false, "pas de preuve tant qu'un fichier reste");
  b.tenace = null;
  p.travaux = [tache(13, GENRE_DOSSIER, { dossier: D1 })];
  await passage(p, b);
  assertEquals(p.effaces.has(D1), true, "repris : effacé");
});

Deno.test("dossier : rien hors de <client>/, même si la porte le listait ; charge invalide ignorée", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  p.bucket = b;
  p.echus.add(D1);
  const etranger = `autre-client/tamila_dossier/${D1}/x.chiffre`;
  b.fichiers.add(etranger);
  p.dossierAEffacer = async (dossier) => ({
    dossier,
    client: CLIENT,
    deja_efface: false,
    fichiers: [{ bucket: "omega-clients", nom: etranger }, { bucket: "omega-clients", nom: `${CLIENT}/../autre-client/y` }],
  });
  p.travaux = [tache(14, GENRE_DOSSIER, { dossier: D1 }), tache(15, GENRE_DOSSIER, { dossier: "pas-un-uuid" })];
  await passage(p, b);
  assertEquals(b.fichiers.has(etranger), true);
  assertEquals(p.finis.map((f) => f.id).sort(), [14, 15]);
});

Deno.test("archive échue : le fichier est effacé puis la purge constatée ; la clé d'un dossier effacé est détruite", async () => {
  const p = new PortesMemoire();
  const b = new BucketMemoire();
  p.bucket = b;
  const E = "e1e1e1e1-0000-4000-8000-0000000000e1";
  const chemin = `${CLIENT}/tamila_export/${E}/archive.zip`;
  b.fichiers.add(chemin);
  p.exports.set(E, chemin);
  p.travaux = [tache(20, GENRE_EXPORT, { export: E, chemin }), tache(21, GENRE_CLE, { dossier: D1 })];
  const bilan = await passage(p, b);
  assertEquals([bilan.exports, bilan.cles, bilan.echecs], [1, 1, 0]);
  assertEquals(b.fichiers.size, 0);
  assertEquals(p.exportsPurges, [E]);
  assertEquals(p.clesDetruites, [D1]);
});

Deno.test("StockageSupabase : DELETE sur le bucket, les chemins en prefixes, la clé de service", async () => {
  let appel: { url: string; init?: RequestInit } | null = null;
  const f = ((url: string, init?: RequestInit) => {
    appel = { url, init };
    return Promise.resolve(new Response(JSON.stringify([{ name: "a" }, { name: "b" }])));
  }) as unknown as typeof fetch;
  const s = new StockageSupabase("https://x.supabase.co/", "cle-service", "omega-clients", f);
  assertEquals(await s.effacer(["c/receptions/m/a.pdf", "c/receptions/m/b.pdf"]), 2);
  assertEquals(appel!.url, "https://x.supabase.co/storage/v1/object/omega-clients");
  assertEquals(appel!.init!.method, "DELETE");
  assertEquals(JSON.parse(String(appel!.init!.body)), { prefixes: ["c/receptions/m/a.pdf", "c/receptions/m/b.pdf"] });
  assertEquals(await s.effacer([]), 0);
});
