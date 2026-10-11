// Un passage de l'ouvrier TAMILA-PURGE : prendre les travaux d'effacement de Tamila, effacer au bucket, faire
// constater par la base, battre. Chaque travail se termine par finir ou échouer.
//   · tamila.purger_reception (b4_10) : la copie en clair d'un avis reçu par courriel, une fois l'avis rattaché,
//     écarté ou expiré ; rien hors de <client>/receptions/.
//   · tamila.effacer_dossier (ronde horaire, à l'échéance ; b4_11) : la base liste les fichiers du dossier (et
//     refuse avant l'échéance), l'ouvrier les efface, puis la base vérifie qu'il n'en reste aucun avant de poser la
//     preuve d'effacement ; rien hors de <client>/.
//   · tamila.purger_export (ronde horaire) : l'archive échue, puis tamila_export_purge (qui vérifie le stockage).
//   · tamila.detruire_cle (ronde horaire, sept jours après l'effacement) : tamila_cle_detruite met l'enveloppe à zéro.
//   · tamila.exporter (demande d'export, b4_17) : l'archive ZIP du dossier — manifeste (tel que la base le tient, champs
//     chiffrés compris), pièces chiffrées telles qu'au bucket, LISEZMOI — déposée sous <client>/tamila_dossier/<dossier>/
//     exports/, puis déclarée prête. Le serveur ne déchiffre rien : le navigateur ouvre l'archive avec la clé du dossier.

import { ErreurPorte, type Portes } from "./portes.ts";
import type { Stockage } from "./stockage.ts";
import { type Entree, zipper } from "./zip.ts";

export const GENRE = "tamila.purger_reception";
export const GENRE_DOSSIER = "tamila.effacer_dossier";
export const GENRE_EXPORT = "tamila.purger_export";
export const GENRE_CLE = "tamila.detruire_cle";
export const GENRE_ARCHIVE = "tamila.exporter";
export const GENRES = [GENRE, GENRE_DOSSIER, GENRE_EXPORT, GENRE_CLE, GENRE_ARCHIVE];
/** Au-delà, l'archive ne tient pas dans la mémoire d'une fonction : l'export échoue, motivé. */
export const ARCHIVE_MAX_OCTETS = 120 * 1024 * 1024;

export const LISEZMOI = `Archive Tamila d'un dossier.

manifeste.json : le dossier tel que la base le tient. Les champs écrits « \\x01… » (référence, intitulé, n° RG,
noms des parties, descriptions du temps, résultats des lectures) sont chiffrés avec la clé du dossier.
pieces/ : les pièces, chiffrées avec la même clé (AES-256-GCM ; 01, nonce de 12 octets, chiffré, étiquette de 16).

Le serveur d'Omega ne peut pas les lire. Ouvrez l'archive depuis l'écran Tamila (« Télécharger ») : votre navigateur
la déchiffre avec la clé du dossier et vous remet la même archive en clair.
`;

export interface Bilan {
  pris: number;
  purges: number;
  archives: number;
  dossiers: number;
  exports: number;
  cles: number;
  fichiers: number;
  echecs: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Défense en profondeur : un chemin sous ce préfixe, sans remontée, quoi que dise la porte. */
const sous = (chemin: string, prefixe: string) => chemin.startsWith(prefixe) && !chemin.includes("..");

export async function passage(portes: Portes, stockage: Stockage, journal: (m: string, d?: Record<string, unknown>) => void = () => {}): Promise<Bilan> {
  const bilan: Bilan = { pris: 0, purges: 0, archives: 0, dossiers: 0, exports: 0, cles: 0, fichiers: 0, echecs: 0 };
  const travaux = await portes.prendreTravaux(GENRES, 20, "10 minutes", "tamila-purge");
  bilan.pris = travaux.length;
  for (const t of travaux) {
    try {
      if (t.genre === GENRE) {
        const reception = Number(t.charge?.reception);
        if (!Number.isInteger(reception) || reception <= 0) {
          await portes.finirTravail(t.id, { ignore: "charge sans réception" });
          continue;
        }
        const { chemins, client } = await portes.aPurger(reception);
        const n = await stockage.effacer(chemins.filter((c) => sous(c, `${client}/receptions/`)));
        await portes.purgee(reception, n);
        await portes.finirTravail(t.id, { reception, fichiers: n });
        bilan.purges++;
        bilan.fichiers += n;
      } else if (t.genre === GENRE_DOSSIER) {
        const dossier = String(t.charge?.dossier ?? "");
        if (!UUID.test(dossier)) {
          await portes.finirTravail(t.id, { ignore: "charge sans dossier" });
          continue;
        }
        const a = await portes.dossierAEffacer(dossier);
        const parBucket = new Map<string, string[]>();
        for (const f of a.fichiers) {
          if (!sous(f.nom, `${a.client}/`)) continue;
          parBucket.set(f.bucket, [...(parBucket.get(f.bucket) ?? []), f.nom]);
        }
        let n = 0;
        for (const [bucket, chemins] of parBucket) n += await stockage.effacer(chemins, bucket);
        // La base refuse (55000) s'il reste un fichier : le travail est alors repris au passage suivant.
        const preuve = await portes.effacerDossierVerifie(dossier).catch((e) => {
          if (e instanceof ErreurPorte && e.code === "55000") throw new ErreurPorte(e.code, e.message, true);
          throw e;
        });
        await portes.finirTravail(t.id, { dossier, fichiers: n, deja_efface: a.deja_efface || !!preuve?.deja_efface });
        bilan.dossiers++;
        bilan.fichiers += n;
      } else if (t.genre === GENRE_EXPORT) {
        const exportId = String(t.charge?.export ?? "");
        const chemin = typeof t.charge?.chemin === "string" ? t.charge.chemin : null;
        if (!UUID.test(exportId)) {
          await portes.finirTravail(t.id, { ignore: "charge sans archive" });
          continue;
        }
        const n = chemin && t.client_id && sous(chemin, `${t.client_id}/`) ? await stockage.effacer([chemin]) : 0;
        await portes.exportPurge(exportId);
        await portes.finirTravail(t.id, { export: exportId, fichiers: n });
        bilan.exports++;
        bilan.fichiers += n;
      } else if (t.genre === GENRE_CLE) {
        const dossier = String(t.charge?.dossier ?? "");
        if (!UUID.test(dossier)) {
          await portes.finirTravail(t.id, { ignore: "charge sans dossier" });
          continue;
        }
        await portes.cleDetruite(dossier, { par: "tamila-purge", le: new Date().toISOString(), enveloppe: "mise à zéro" });
        await portes.finirTravail(t.id, { dossier, cle: "detruite" });
        bilan.cles++;
      } else if (t.genre === GENRE_ARCHIVE) {
        const exportId = String(t.charge?.export ?? "");
        if (!UUID.test(exportId)) {
          await portes.finirTravail(t.id, { ignore: "charge sans export" });
          continue;
        }
        const r = await archiver(portes, stockage, exportId).catch(async (e) => {
          // un refus de la base ou une pièce absente ne se reprend pas : l'export échoue, motivé
          if (e instanceof ErreurPorte && !e.reprendre) {
            await portes.exportEchec(
              exportId,
              e.code === "TROP_LOURD" ? "archive_trop_lourde" : e.code === "PIECE_ABSENTE" ? "piece_introuvable" : "export_refuse",
            ).catch(() => {});
          }
          throw e;
        });
        await portes.finirTravail(t.id, { export: exportId, ...r });
        bilan.archives++;
      } else {
        await portes.finirTravail(t.id, { ignore: `genre inconnu : ${t.genre}` });
      }
    } catch (e) {
      bilan.echecs++;
      const reprendre = e instanceof ErreurPorte ? e.reprendre : true;
      journal("travail en échec", { travail: t.id, genre: t.genre, motif: (e as Error).message, reprendre });
      await portes.echouerTravail(t.id, (e as Error).message, reprendre).catch(() => {});
    }
  }
  await portes.battreOuvrier("tamila", GENRES, { passage: new Date().toISOString(), ...bilan }).catch(() => {});
  return bilan;
}

async function sha256(octets: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(octets)));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** L'archive d'un export : manifeste, pièces chiffrées, LISEZMOI ; rangée au bucket, puis déclarée prête. */
export async function archiver(portes: Portes, stockage: Stockage, exportId: string): Promise<{ pieces: number; octets: number }> {
  const c = await portes.exportContenu(exportId);
  const enc = new TextEncoder();
  const manifeste = enc.encode(JSON.stringify(c, null, 2));
  const entrees: Entree[] = [{ nom: "LISEZMOI.txt", octets: enc.encode(LISEZMOI) }, { nom: "manifeste.json", octets: manifeste }];
  let total = manifeste.length;
  let n = 0;
  const prefixe = `${c.client}/`;
  for (const d of c.dossiers) {
    for (const p of d.pieces ?? []) {
      if (!p.chemin.startsWith(prefixe) || p.chemin.includes("..")) continue;
      const octets = await stockage.lire(p.chemin);
      if (!octets) throw new ErreurPorte("PIECE_ABSENTE", `pièce absente du bucket : ${p.id}`, false);
      total += octets.length;
      if (total > ARCHIVE_MAX_OCTETS) throw new ErreurPorte("TROP_LOURD", "archive au-delà de 120 Mo", false);
      const nom = p.nom_fichier.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
      entrees.push({ nom: `pieces/${p.id.slice(0, 8)}-${nom}.chiffre`, octets });
      n++;
    }
  }
  const zip = zipper(entrees);
  const chemin = c.dossier ? `${c.client}/tamila_dossier/${c.dossier}/exports/${exportId}.zip` : `${c.client}/tamila/exports/${exportId}.zip`;
  await stockage.deposer(chemin, zip, "application/zip");
  await portes.exportPret(exportId, chemin, zip.length, await sha256(manifeste));
  return { pieces: n, octets: zip.length };
}
