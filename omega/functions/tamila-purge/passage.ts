// Un passage de l'ouvrier TAMILA-PURGE : prendre les travaux d'effacement de Tamila, effacer au bucket, faire
// constater par la base, battre. Chaque travail se termine par finir ou échouer.
//   · tamila.purger_reception (b4_10) : la copie en clair d'un avis reçu par courriel, une fois l'avis rattaché,
//     écarté ou expiré ; rien hors de <client>/receptions/.
//   · tamila.effacer_dossier (ronde horaire, à l'échéance ; b4_11) : la base liste les fichiers du dossier (et
//     refuse avant l'échéance), l'ouvrier les efface, puis la base vérifie qu'il n'en reste aucun avant de poser la
//     preuve d'effacement ; rien hors de <client>/.
//   · tamila.purger_export (ronde horaire) : l'archive échue, puis tamila_export_purge (qui vérifie le stockage).
//   · tamila.detruire_cle (ronde horaire, sept jours après l'effacement) : tamila_cle_detruite met l'enveloppe à zéro.

import { ErreurPorte, type Portes } from "./portes.ts";
import type { Stockage } from "./stockage.ts";

export const GENRE = "tamila.purger_reception";
export const GENRE_DOSSIER = "tamila.effacer_dossier";
export const GENRE_EXPORT = "tamila.purger_export";
export const GENRE_CLE = "tamila.detruire_cle";
export const GENRES = [GENRE, GENRE_DOSSIER, GENRE_EXPORT, GENRE_CLE];

export interface Bilan {
  pris: number;
  purges: number;
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
  const bilan: Bilan = { pris: 0, purges: 0, dossiers: 0, exports: 0, cles: 0, fichiers: 0, echecs: 0 };
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
