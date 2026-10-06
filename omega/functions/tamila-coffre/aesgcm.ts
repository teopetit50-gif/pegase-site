// Le format des chiffrés Tamila, celui du navigateur (components/espace/tamila/chiffrement.ts) et de
// private.tamila_chiffre_valide : 01 ‖ nonce (12) ‖ chiffré ‖ étiquette (16), AES-256-GCM, sans données
// associées. Le lecteur s'en sert pour déchiffrer une pièce avec la clé que le coffre lui a rendue ;
// le coffre, pour vérifier qu'une clé ouvre bien le témoin d'un dossier avant de la ré-envelopper.

import { tampon } from "./octets.ts";

export const VERSION = 1;
export const LONGUEUR_CLE = 32;

async function importer(cle: Uint8Array): Promise<CryptoKey> {
  if (cle.length !== LONGUEUR_CLE) throw new Error("une clé de dossier fait 32 octets");
  return await crypto.subtle.importKey("raw", tampon(cle), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function chiffrer(cle: Uint8Array, clair: Uint8Array): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: tampon(nonce) }, await importer(cle), tampon(clair)));
  const sortie = new Uint8Array(1 + 12 + ct.length);
  sortie[0] = VERSION;
  sortie.set(nonce, 1);
  sortie.set(ct, 13);
  return sortie;
}

/** Déchiffre ; lève si la version, la longueur ou l'étiquette ne vont pas (mauvaise clé, octets altérés). */
export async function dechiffrer(cle: Uint8Array, chiffre: Uint8Array): Promise<Uint8Array> {
  if (chiffre.length < 29 || chiffre[0] !== VERSION) throw new Error("chiffré Tamila illisible (version ou longueur)");
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: tampon(chiffre.slice(1, 13)) }, await importer(cle), tampon(chiffre.slice(13))),
  );
}

/** La clé ouvre-t-elle ce chiffré ? (l'étiquette GCM en décide ; le clair est aussitôt effacé) */
export async function ouvre(cle: Uint8Array, chiffre: Uint8Array): Promise<boolean> {
  try {
    const clair = await dechiffrer(cle, chiffre);
    clair.fill(0);
    return true;
  } catch {
    return false;
  }
}
