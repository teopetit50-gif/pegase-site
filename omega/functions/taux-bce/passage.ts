// Un passage : lire l'état, choisir le flux (quotidien, ou 90 jours s'il manque des jours), poser les taux
// nouveaux en un lot, noter le passage ; alerte si un jour ouvré TARGET passé 16 h 15 à Francfort n'a toujours
// aucun taux du jour. Rejouable : un taux déjà posé n'est pas réécrit, l'alerte n'est levée qu'une fois par jour.

import { journal, messageDe } from "@partage/journal.ts";
import { dernierJour, type SourceBce, type Taux, URL_90_JOURS, URL_QUOTIDIEN } from "./bce.ts";
import { ecartJours, francfort, jourOuvreTarget } from "./calendrier.ts";
import type { BilanLot, PortesTaux } from "./portes.ts";

export interface ContexteTaux {
  portes: PortesTaux;
  source: SourceBce;
  maintenant: () => Date;
}

/** Heure de Francfort après laquelle un jour ouvré sans taux du jour est anormal (la BCE publie vers 16 h). */
export const HEURE_ATTENDUE = "16:15";
/** Au-delà de ce trou (en jours) depuis le dernier jour en base, on relit les 90 jours. */
export const TROU_MAX_JOURS = 4;

export interface BilanTaux {
  flux: "quotidien" | "90_jours" | null;
  jour_bce: string | null;
  lus: number;
  lot: BilanLot | null;
  jour_francfort: string;
  heure_francfort: string;
  jour_ouvre: boolean;
  alerte: string | null;
  erreur?: string;
}

function jjmmaaaa(jour: string): string {
  return `${jour.slice(8, 10)}/${jour.slice(5, 7)}/${jour.slice(0, 4)}`;
}

export async function passage(ctx: ContexteTaux): Promise<BilanTaux> {
  const { jour, heure } = francfort(ctx.maintenant());
  const bilan: BilanTaux = {
    flux: null,
    jour_bce: null,
    lus: 0,
    lot: null,
    jour_francfort: jour,
    heure_francfort: heure,
    jour_ouvre: jourOuvreTarget(jour),
    alerte: null,
  };
  let dejaDuJour = false;
  try {
    const etat = await ctx.portes.etat();
    dejaDuJour = etat.dernier_jour === jour && etat.devises > 0;
    const trou = etat.dernier_jour === null || ecartJours(etat.dernier_jour, jour) > TROU_MAX_JOURS;
    bilan.flux = trou ? "90_jours" : "quotidien";
    let taux: Taux[] = await ctx.source.lire(trou ? URL_90_JOURS : URL_QUOTIDIEN);
    bilan.lus = taux.length;
    bilan.jour_bce = dernierJour(taux);
    // Seuls les jours postérieurs au dernier jour en base partent (le dernier lui-même aussi : une correction de la BCE).
    if (etat.dernier_jour) taux = taux.filter((t) => t.jour >= etat.dernier_jour!);
    bilan.lot = taux.length > 0 ? await ctx.portes.poserLot(taux) : { recus: 0, poses: 0, inchanges: 0, saisies_gardees: 0, refuses: 0 };
    if (bilan.jour_bce === jour) dejaDuJour = true;
    if (bilan.lot.refuses > 0) journal("alerte", "taux BCE refusés par la porte", { refuses: bilan.lot.refuses });
  } catch (e) {
    bilan.erreur = messageDe(e);
    journal("erreur", "passage taux-bce interrompu", { erreur: bilan.erreur });
  }
  if (bilan.jour_ouvre && heure >= HEURE_ATTENDUE && !dejaDuJour) {
    bilan.alerte = `Aucun taux BCE pour le ${jjmmaaaa(jour)} (jour ouvré TARGET) à ${heure}, heure de Francfort` +
      (bilan.erreur ? ` : ${bilan.erreur}` : bilan.jour_bce ? ` ; dernier jour publié : ${jjmmaaaa(bilan.jour_bce)}.` : ".");
  }
  try {
    await ctx.portes.noterPassage({
      jour_bce: bilan.jour_bce,
      poses: bilan.lot?.poses ?? 0,
      flux: bilan.flux,
      lus: bilan.lus,
      lot: bilan.lot,
      jour_francfort: jour,
      heure_francfort: heure,
      jour_ouvre: bilan.jour_ouvre,
      ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
    }, bilan.alerte);
  } catch (e) {
    journal("erreur", "taux_bce_noter_passage a échoué", { erreur: messageDe(e) });
  }
  journal(bilan.alerte ? "alerte" : "info", "passage taux-bce terminé", { ...bilan });
  return bilan;
}
