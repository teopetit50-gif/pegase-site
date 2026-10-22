// Assemble le paquet à déployer : tous les fichiers que le lecteur importe, depuis index.ts, en suivant
// les imports (relatifs et @partage/) ; le socle partagé est copié sous ./_partage, et le deno.json fait
// pointer l'alias @partage/ dedans. Rien n'est listé à la main : un nouveau dossier (analyse/, media/,
// mesure/…) entre dans le paquet dès qu'un fichier déployé l'importe.
// Sortie : un JSON { entrypoint_path, import_map_path, files: [{name, content}] } pour l'outil de
// déploiement, écrit dans le chemin passé en argument (par défaut ./outils/paquet.json).

const ici = new URL(".", import.meta.url);
const racine = new URL("../", ici);
const partage = new URL("../../_partage/", ici);

/** Les spécificateurs importés par un fichier : import … from "x", export … from "x", import("x"), import "x". */
export function importsDe(source: string): string[] {
  const vus = new Set<string>();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
  for (const m of source.matchAll(re)) vus.add(m[1]);
  return [...vus];
}

/** Le nom d'un fichier dans le paquet : relatif au lecteur, ou « _partage/… » pour le socle partagé. */
function nomDansPaquet(url: URL): string | null {
  if (url.href.startsWith(racine.href)) return url.href.slice(racine.href.length);
  if (url.href.startsWith(partage.href)) return "_partage/" + url.href.slice(partage.href.length);
  return null;
}

export async function assembler(entree = "index.ts"): Promise<{ name: string; content: string }[]> {
  const fichiers = new Map<string, string>();
  const aVoir: URL[] = [new URL(entree, racine)];
  while (aVoir.length > 0) {
    const url = aVoir.pop()!;
    const nom = nomDansPaquet(url);
    if (!nom) throw new Error(`Import hors du lecteur et du socle partagé : ${url.href}`);
    if (fichiers.has(nom)) continue;
    const source = await Deno.readTextFile(url);
    fichiers.set(nom, source);
    for (const spec of importsDe(source)) {
      if (spec.startsWith("@partage/")) aVoir.push(new URL(spec.slice("@partage/".length), partage));
      else if (spec.startsWith("./") || spec.startsWith("../")) aVoir.push(new URL(spec, url));
      // les autres (jsr:, npm:, @std/…) passent par l'import map
    }
  }
  return [...fichiers.entries()].map(([name, content]) => ({ name, content })).sort((a, b) => a.name.localeCompare(b.name));
}

if (import.meta.main) {
  const fichiers = await assembler();
  // Le SHA court du commit déployé, inscrit dans la version du lecteur ; un avertissement si l'arbre n'est pas propre.
  const git = (args: string[]) => new TextDecoder().decode(new Deno.Command("git", { args, cwd: racine.pathname }).outputSync().stdout).trim();
  const sha = git(["rev-parse", "--short=7", "HEAD"]);
  const sale = git(["status", "--porcelain", "--", "."]) !== "";
  const version = fichiers.find((f) => f.name === "version_paquet.ts");
  if (!version || !/^[0-9a-f]{7}$/.test(sha)) throw new Error("version_paquet.ts absent du paquet, ou SHA illisible");
  if (sale) console.warn("ATTENTION : le lecteur a des modifications non commitées ; le paquet ne correspond pas au SHA " + sha);
  version.content = `// Écrit par outils/preparer_deploiement.ts.\nexport const SHA_PAQUET: string | null = ${JSON.stringify(sha)};\n`;
  const denoJson = JSON.parse(await Deno.readTextFile(new URL("deno.json", racine)));
  denoJson.imports["@partage/"] = "./_partage/";
  delete denoJson.tasks;
  fichiers.push({ name: "deno.json", content: JSON.stringify(denoJson, null, 2) + "\n" });

  const cible = Deno.args[0] ?? new URL("paquet.json", ici).pathname;
  await Deno.writeTextFile(cible, JSON.stringify({ entrypoint_path: "index.ts", import_map_path: "deno.json", files: fichiers }, null, 2));
  console.log(`${fichiers.length} fichiers → ${cible}`);
  for (const f of fichiers) console.log(`  ${f.name} (${f.content.length})`);
}
