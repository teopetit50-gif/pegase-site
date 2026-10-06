// deno-lint-ignore-file require-await
// Le passage de tamila-purge avec des portes et un bucket en mémoire. Aucun appel réseau.

import { assertEquals } from "@std/assert";
import { GENRE, passage } from "../passage.ts";
import { ErreurPorte, type Portes, type Travail } from "../portes.ts";
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
}

class BucketMemoire implements Stockage {
  fichiers = new Set<string>();
  panne = false;
  async effacer(chemins: string[]) {
    if (this.panne) throw new Error("Storage 503");
    let n = 0;
    for (const c of chemins) if (this.fichiers.delete(c)) n++;
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
  assertEquals(bilan, { pris: 1, purges: 1, fichiers: 2, echecs: 0 });
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
