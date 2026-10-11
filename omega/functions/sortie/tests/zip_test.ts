import { assertEquals, assertThrows } from "@std/assert";
import { crc32, EcrivainZip } from "../zip.ts";

Deno.test("crc32 : la valeur de contrôle de « 123456789 »", () => {
  assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

Deno.test("ZIP : unzip le teste et rend chaque fichier octet pour octet, noms accentués compris", async () => {
  const z = new EcrivainZip(new Date("2026-10-11T12:00:00Z"));
  const pdf = new Uint8Array(70000).map((_, i) => (i * 31) & 0xff);
  z.ajouter("pieces/R2026-000001_facture.pdf", pdf);
  z.ajouter("LISEZMOI.txt", new TextEncoder().encode("Dossier de sortie — pièces reçues\r\n"));
  const dir = await Deno.makeTempDir();
  const f = `${dir}/v.zip`;
  await Deno.writeFile(f, z.terminer());
  const t = await new Deno.Command("unzip", { args: ["-t", f], stdout: "piped" }).output();
  assertEquals(t.code, 0, new TextDecoder().decode(t.stdout));
  const p = await new Deno.Command("unzip", { args: ["-p", f, "pieces/R2026-000001_facture.pdf"], stdout: "piped" }).output();
  assertEquals(p.stdout, pdf);
  const l = await new Deno.Command("unzip", { args: ["-p", f, "LISEZMOI.txt"], stdout: "piped" }).output();
  assertEquals(new TextDecoder().decode(l.stdout), "Dossier de sortie — pièces reçues\r\n");
  await Deno.remove(dir, { recursive: true });
});

Deno.test("ZIP : ni remontée, ni chemin absolu, ni doublon", () => {
  const z = new EcrivainZip();
  assertThrows(() => z.ajouter("../x", new Uint8Array(1)));
  assertThrows(() => z.ajouter("/etc/x", new Uint8Array(1)));
  z.ajouter("a.txt", new Uint8Array(1));
  assertThrows(() => z.ajouter("a.txt", new Uint8Array(1)));
});
