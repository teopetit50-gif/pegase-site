/* ══════════════════════════════════════════════════════════════════════
   L'archive d'un dossier, ouverte dans le navigateur (11/10/2026,
   session B4, b4_17)

   L'ouvrier tamila.exporter range au bucket une archive que le serveur
   ne sait pas lire : le manifeste garde ses champs chiffrés (« \x01… »)
   et les pièces restent chiffrées. Au téléchargement, le navigateur
   l'ouvre avec la clé du dossier et rend la même archive en clair :
   dossier.json (chaque champ déchiffré, les lectures longues relues),
   les pièces sous leur nom, un LISEZMOI qui dit ce qui n'a pas pu
   l'être. Rien ne repart au serveur.
   ══════════════════════════════════════════════════════════════════════ */

import { dechiffrer, dechiffrerOctets } from "./chiffrement";
import { dezipper, zipper, type Entree } from "./zip";

/* chaque chaîne « \x01… » est un champ chiffré sous la clé du dossier ; resultat_chiffre est un JSON */
async function dechiffrerTout(x: unknown, cle: CryptoKey, rates: string[], chemin: string): Promise<unknown> {
  if (typeof x === "string" && x.startsWith("\\x01")) {
    const c = await dechiffrer(cle, x);
    if (c === null) {
      rates.push(chemin);
      return x;
    }
    if (chemin.endsWith("resultat_chiffre")) {
      try {
        return JSON.parse(c);
      } catch {
        return c;
      }
    }
    return c;
  }
  if (Array.isArray(x)) return Promise.all(x.map((y, i) => dechiffrerTout(y, cle, rates, `${chemin}[${i}]`)));
  if (x && typeof x === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) out[k.replace(/_chiffree?s?$/, "")] = await dechiffrerTout(v, cle, rates, `${chemin}.${k}`);
    return out;
  }
  return x;
}

export async function ouvrirArchive(chiffree: Uint8Array, cle: CryptoKey): Promise<{ zip: Uint8Array; pieces: number; rates: string[] }> {
  const entrees = dezipper(chiffree);
  const manifeste = entrees.find((e) => e.nom === "manifeste.json");
  if (!manifeste) throw new Error("Archive sans manifeste.");
  const rates: string[] = [];
  const clair = await dechiffrerTout(JSON.parse(new TextDecoder().decode(manifeste.octets)), cle, rates, "dossier");
  const sortie: Entree[] = [{ nom: "dossier.json", octets: new TextEncoder().encode(JSON.stringify(clair, null, 2)) }];
  let pieces = 0;
  for (const e of entrees) {
    if (!e.nom.startsWith("pieces/")) continue;
    const ouverte = e.nom.endsWith(".chiffre") ? await dechiffrerOctets(cle, e.octets) : null;
    if (ouverte) {
      sortie.push({ nom: e.nom.replace(/\.chiffre$/, ""), octets: ouverte });
      pieces++;
    } else {
      sortie.push(e);
      rates.push(e.nom);
    }
  }
  const lisezmoi = `Archive Tamila du dossier, ouverte dans votre navigateur le ${new Date().toLocaleString("fr-FR")}.

dossier.json : le dossier en clair (parties, délais, audiences, avis, expertises, temps, honoraires, journal des accès,
lectures longues). pieces/ : les ${pieces} pièce(s) déchiffrée(s), sous leur nom.
${rates.length ? `\nNon déchiffré avec la clé de ce dossier (${rates.length}) :\n${rates.map((r) => `· ${r}`).join("\n")}\n` : "\nTout a été déchiffré.\n"}`;
  sortie.unshift({ nom: "LISEZMOI.txt", octets: new TextEncoder().encode(lisezmoi) });
  return { zip: zipper(sortie), pieces, rates };
}
