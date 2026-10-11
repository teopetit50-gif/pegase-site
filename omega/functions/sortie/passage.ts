// Un passage de l'ouvrier SORTIE : prend le plus ancien dossier à préparer, écrit ses volumes manquants un par un
// (chaque pièce lue dans Storage et vérifiée contre son SHA-256 avant d'entrer dans l'archive), les déclare à la base,
// et s'arrête avant la limite de temps : le passage suivant reprend au volume suivant. Puis retire les volumes des
// dossiers expirés.

import { journal, messageDe } from "@partage/journal.ts";

const texte = (e: unknown, max = 500) => (e instanceof Error ? e.message : messageDe(e)).slice(0, max);
import type { Dossier, PortesSortie } from "./portes.ts";
import type { Stockage } from "./stockage.ts";
import { EcrivainZip } from "./zip.ts";

export interface Contexte {
  portes: PortesSortie;
  stockage: Stockage;
  maintenant: () => Date;
  /** Millisecondes de travail permises par passage (les fonctions Edge s'arrêtent à 150 s). */
  budgetMs: number;
}

export interface Bilan {
  dossier: string | null;
  volumes: number;
  etat: string | null;
  expires: number;
  erreur?: string;
}

async function sha256hex(d: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", d as unknown as ArrayBuffer));
  return Array.from(h, (o) => o.toString(16).padStart(2, "0")).join("");
}

/** Écrit le volume n d'un dossier ; lève si une pièce manque ou ne correspond plus à son empreinte. */
export async function ecrireVolume(ctx: Contexte, d: Dossier, n: number): Promise<{ chemin: string; sha256: string; octets: number }> {
  const zip = new EcrivainZip(ctx.maintenant());
  const enc = new TextEncoder();
  for (const e of d.manifeste.filter((x) => x.volume === n)) {
    if (typeof e.contenu === "string") {
      zip.ajouter(e.chemin_zip, enc.encode(e.contenu));
      continue;
    }
    if (!e.chemin) throw new Error(`entrée sans fichier ni contenu : ${e.chemin_zip}`);
    let donnees: Uint8Array;
    try {
      donnees = await ctx.stockage.lire(e.chemin);
    } catch (err) {
      throw new Error(`pièce introuvable dans Storage : ${e.chemin_zip} (${texte(err, 200)})`);
    }
    if (e.sha256 && /^[0-9a-f]{64}$/.test(e.sha256) && (await sha256hex(donnees)) !== e.sha256) {
      throw new Error(`empreinte différente pour ${e.chemin_zip} : le fichier stocké n'est plus celui reçu`);
    }
    zip.ajouter(e.chemin_zip, donnees);
  }
  const archive = zip.terminer();
  const chemin = `${d.chemin_base}/dossier-${String(n).padStart(2, "0")}.zip`;
  await ctx.stockage.ecrire(chemin, archive, "application/zip");
  return { chemin, sha256: await sha256hex(archive), octets: archive.length };
}

export async function passage(ctx: Contexte): Promise<Bilan> {
  const debut = Date.now();
  const bilan: Bilan = { dossier: null, volumes: 0, etat: null, expires: 0 };
  const [d] = await ctx.portes.aPreparer(1);
  if (d) {
    bilan.dossier = d.id;
    try {
      for (let n = 1; n <= d.volumes_total; n++) {
        if (d.faits.includes(n)) continue;
        if (bilan.volumes > 0 && Date.now() - debut > ctx.budgetMs) break;
        const v = await ecrireVolume(ctx, d, n);
        bilan.etat = await ctx.portes.volume(d.id, { n, ...v });
        bilan.volumes++;
        journal("info", "sortie : volume écrit", { dossier: d.id, n, octets: v.octets });
      }
    } catch (e) {
      bilan.erreur = texte(e);
      bilan.etat = await ctx.portes.echec(d.id, bilan.erreur);
      journal("alerte", "sortie : préparation interrompue", { dossier: d.id, erreur: bilan.erreur, etat: bilan.etat });
    }
  }
  for (const x of await ctx.portes.expirees(50)) {
    try {
      await ctx.stockage.retirer(x.chemins);
      bilan.expires++;
    } catch (e) {
      journal("alerte", "sortie : volumes expirés non retirés", { dossier: x.id, erreur: messageDe(e) });
    }
  }
  return bilan;
}
