// Un passage de l'ouvrier TAMILA-PURGE : prendre les travaux tamila.purger_reception (déposés par b4_10 au
// rattachement, à l'écartement ou à l'expiration d'un avis reçu par courriel), effacer au bucket les pièces jointes
// de la réception (la copie en clair), constater la purge, battre. Chaque travail se termine par finir ou échouer.

import { ErreurPorte, type Portes } from "./portes.ts";
import type { Stockage } from "./stockage.ts";

export const GENRE = "tamila.purger_reception";

export interface Bilan {
  pris: number;
  purges: number;
  fichiers: number;
  echecs: number;
}

export async function passage(portes: Portes, stockage: Stockage, journal: (m: string, d?: Record<string, unknown>) => void = () => {}): Promise<Bilan> {
  const bilan: Bilan = { pris: 0, purges: 0, fichiers: 0, echecs: 0 };
  const travaux = await portes.prendreTravaux([GENRE], 20, "10 minutes", "tamila-purge");
  bilan.pris = travaux.length;
  for (const t of travaux) {
    const reception = Number(t.charge?.reception);
    try {
      if (!Number.isInteger(reception) || reception <= 0) {
        await portes.finirTravail(t.id, { ignore: "charge sans réception" });
        continue;
      }
      const { chemins, client } = await portes.aPurger(reception);
      // Défense en profondeur : rien hors de <client>/receptions/ ne s'efface, quoi que dise la porte.
      const surs = chemins.filter((c) => c.startsWith(`${client}/receptions/`) && !c.includes(".."));
      const n = await stockage.effacer(surs);
      await portes.purgee(reception, n);
      await portes.finirTravail(t.id, { reception, fichiers: n });
      bilan.purges++;
      bilan.fichiers += n;
    } catch (e) {
      bilan.echecs++;
      const reprendre = e instanceof ErreurPorte ? e.reprendre : true;
      journal("purge en échec", { travail: t.id, reception, motif: (e as Error).message, reprendre });
      await portes.echouerTravail(t.id, (e as Error).message, reprendre).catch(() => {});
    }
  }
  await portes.battreOuvrier("tamila", [GENRE], { passage: new Date().toISOString(), ...bilan }).catch(() => {});
  return bilan;
}
