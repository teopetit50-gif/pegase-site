// Engendre les fichiers du banc et leurs attendus : `deno task banc`.

import { CAS } from "./cas.ts";
import { ecrirePdf, ecrirePng, imageBruitee, type PageSpec } from "./pdf_minimal.ts";

const ici = new URL(".", import.meta.url);
const dossierFichiers = new URL("fichiers/", ici);
const dossierAttendus = new URL("attendus/", ici);
await Deno.mkdir(dossierFichiers, { recursive: true });
await Deno.mkdir(dossierAttendus, { recursive: true });

export async function octetsDuCas(cas: (typeof CAS)[number]): Promise<Uint8Array> {
  if (cas.xml) return new TextEncoder().encode(cas.xml);
  if (cas.csv) return new TextEncoder().encode(cas.csv);
  if (cas.image === "png") return await ecrirePng(240, 320, imageBruitee(240, 320, 3));
  const pages: PageSpec[] = [];
  for (const p of cas.pagesTexte ?? []) pages.push({ type: "texte", lignes: p });
  for (let i = 0; i < (cas.pagesImage ?? 0); i++) pages.push({ type: "image", largeur: 32, hauteur: 32, pixels: imageBruitee(32, 32, 11 + i) });
  const pj = cas.pieceJointeXml ? [{ nom: "factur-x.xml", mime: "text/xml", octets: new TextEncoder().encode(cas.pieceJointeXml) }] : [];
  return ecrirePdf(pages, pj);
}

if (import.meta.main) {
  for (const cas of CAS) {
    const octets = await octetsDuCas(cas);
    await Deno.writeFile(new URL(cas.fichier, dossierFichiers), octets);
    await Deno.writeTextFile(
      new URL(`${cas.id}.json`, dossierAttendus),
      JSON.stringify({ titre: cas.titre, fichier: cas.fichier, mime: cas.mime, ...cas.attendu }, null, 2) + "\n",
    );
    console.log(`${cas.fichier} : ${octets.length} octets`);
  }
}
