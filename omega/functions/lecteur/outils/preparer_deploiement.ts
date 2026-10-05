// Assemble le paquet à déployer : les fichiers du lecteur, le socle partagé
// copié sous ./_partage, et un deno.json dont l'alias @partage/ pointe dedans.
// Sortie : un JSON { files: [{name, content}] } pour l'outil de déploiement,
// écrit dans le dossier passé en argument (par défaut ./outils/paquet.json).

const ici = new URL(".", import.meta.url);
const racine = new URL("../", ici);
const partage = new URL("../../_partage/", ici);

async function lister(dossier: URL, prefixe: string, filtre: (n: string) => boolean): Promise<{ name: string; content: string }[]> {
  const sortie: { name: string; content: string }[] = [];
  for await (const e of Deno.readDir(dossier)) {
    if (e.isFile && filtre(e.name)) sortie.push({ name: prefixe + e.name, content: await Deno.readTextFile(new URL(e.name, dossier)) });
  }
  return sortie.sort((a, b) => a.name.localeCompare(b.name));
}

const ts = (n: string) => n.endsWith(".ts") && !n.endsWith("_test.ts");
const fichiers = [
  ...(await lister(racine, "", ts)),
  ...(await lister(new URL("schemas/", racine), "schemas/", ts)),
  ...(await lister(partage, "_partage/", ts)),
];
const denoJson = JSON.parse(await Deno.readTextFile(new URL("deno.json", racine)));
denoJson.imports["@partage/"] = "./_partage/";
delete denoJson.tasks;
fichiers.push({ name: "deno.json", content: JSON.stringify(denoJson, null, 2) + "\n" });

const cible = Deno.args[0] ?? new URL("paquet.json", ici).pathname;
await Deno.writeTextFile(cible, JSON.stringify({ entrypoint_path: "index.ts", import_map_path: "deno.json", files: fichiers }, null, 2));
console.log(`${fichiers.length} fichiers → ${cible}`);
for (const f of fichiers) console.log(`  ${f.name} (${f.content.length})`);
