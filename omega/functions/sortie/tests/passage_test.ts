import { assert, assertEquals } from "@std/assert";
import { passage } from "../passage.ts";
import type { Dossier, PortesSortie, VolumeEcrit } from "../portes.ts";
import type { Stockage } from "../stockage.ts";

async function sha(t: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  return Array.from(h, (o) => o.toString(16).padStart(2, "0")).join("");
}

class StockageMemoire implements Stockage {
  fichiers = new Map<string, Uint8Array>();
  retires: string[] = [];
  lire(c: string) {
    const d = this.fichiers.get(c);
    return d ? Promise.resolve(d) : Promise.reject(new Error("HTTP 404"));
  }
  ecrire(c: string, d: Uint8Array) {
    this.fichiers.set(c, d);
    return Promise.resolve();
  }
  signer(c: string) {
    return Promise.resolve(`https://exemple.test/${c}`);
  }
  retirer(cs: string[]) {
    this.retires.push(...cs);
    return Promise.resolve();
  }
}

class PortesMemoire implements PortesSortie {
  volumes: VolumeEcrit[] = [];
  echecs: string[] = [];
  constructor(public dossier: Dossier | null, public expires: { id: string; chemins: string[] }[] = []) {}
  aPreparer() {
    return Promise.resolve(this.dossier ? [{ ...this.dossier, faits: this.volumes.map((v) => v.n) }] : []);
  }
  volume(_s: string, v: VolumeEcrit) {
    this.volumes.push(v);
    return Promise.resolve(this.volumes.length === this.dossier!.volumes_total ? "prete" : "a_preparer");
  }
  echec(_s: string, e: string) {
    this.echecs.push(e);
    return Promise.resolve("a_preparer");
  }
  expirees() {
    const x = this.expires;
    this.expires = [];
    return Promise.resolve(x);
  }
  lien() {
    return Promise.reject(new Error("non utilisé"));
  }
}

async function dossier(): Promise<{ d: Dossier; s: StockageMemoire }> {
  const s = new StockageMemoire();
  s.fichiers.set("c/filed_document/a.pdf", new TextEncoder().encode("PDF-A"));
  s.fichiers.set("c/filed_document/b.pdf", new TextEncoder().encode("PDF-B"));
  return {
    s,
    d: {
      id: "11111111-1111-1111-1111-111111111111",
      client: "c",
      chemin_base: "c/filed/sorties/11111111-1111-1111-1111-111111111111",
      volumes_total: 2,
      faits: [],
      manifeste: [
        { volume: 1, chemin_zip: "index.csv", contenu: "reference_reception\r\n" },
        { volume: 1, chemin_zip: "pieces/R2026-000001_a.pdf", chemin: "c/filed_document/a.pdf", sha256: await sha("PDF-A"), octets: 5 },
        { volume: 2, chemin_zip: "pieces/R2026-000002_b.pdf", chemin: "c/filed_document/b.pdf", sha256: await sha("PDF-B"), octets: 5 },
      ],
    },
  };
}

const ctx = (portes: PortesSortie, stockage: Stockage, budgetMs = 100000) => ({
  portes,
  stockage,
  maintenant: () => new Date("2026-10-11T12:00:00Z"),
  budgetMs,
});

Deno.test("passage : deux volumes écrits, déclarés, le dossier est prêt ; les expirés sont retirés", async () => {
  const { d, s } = await dossier();
  const p = new PortesMemoire(d, [{ id: "x", chemins: ["c/filed/sorties/x/dossier-01.zip"] }]);
  const b = await passage(ctx(p, s));
  assertEquals([b.volumes, b.etat, b.expires], [2, "prete", 1]);
  assertEquals(p.volumes.map((v) => v.chemin), [`${d.chemin_base}/dossier-01.zip`, `${d.chemin_base}/dossier-02.zip`]);
  const zip = s.fichiers.get(`${d.chemin_base}/dossier-02.zip`)!;
  assertEquals(p.volumes[1].octets, zip.length);
  assertEquals(new DataView(zip.buffer).getUint32(0, true), 0x04034b50);
  assertEquals(s.retires, ["c/filed/sorties/x/dossier-01.zip"]);
});

Deno.test("passage : au-delà du budget, on s'arrête après un volume et l'on reprend au suivant", async () => {
  const { d, s } = await dossier();
  const p = new PortesMemoire(d);
  assertEquals((await passage(ctx(p, s, -1))).volumes, 1);
  const b = await passage(ctx(p, s, -1));
  assertEquals([b.volumes, b.etat], [1, "prete"]);
  assertEquals(p.volumes.map((v) => v.n), [1, 2]);
});

Deno.test("passage : une pièce modifiée dans Storage arrête le dossier, rien n'est déclaré", async () => {
  const { d, s } = await dossier();
  s.fichiers.set("c/filed_document/a.pdf", new TextEncoder().encode("PDF-A modifié"));
  const p = new PortesMemoire(d);
  const b = await passage(ctx(p, s));
  assertEquals(p.volumes.length, 0);
  assert(p.echecs[0].includes("empreinte différente pour pieces/R2026-000001_a.pdf"));
  assertEquals(b.etat, "a_preparer");
});

Deno.test("passage : une pièce absente de Storage aussi", async () => {
  const { d, s } = await dossier();
  s.fichiers.delete("c/filed_document/b.pdf");
  const p = new PortesMemoire(d);
  await passage(ctx(p, s));
  assertEquals(p.volumes.map((v) => v.n), [1]);
  assert(p.echecs[0].startsWith("pièce introuvable dans Storage : pieces/R2026-000002_b.pdf"));
});
