/* ══════════════════════════════════════════════════════════════════════
   La netteté d'une photo d'état des lieux, mesurée dans le navigateur
   (06/10/2026, session B2 — « la photo floue est refusée »)

   La variance du laplacien sur l'image en gris, réduite à 512 px au plus
   long côté : une photo nette a des bords francs (variance haute), une
   photo bougée ou floue n'en a plus (variance basse). Repères mesurés sur
   les fixtures de omega/recette-b2/photos : nette 2 554, flou léger
   (rayon 1,2) 350, flou franc (rayon 4) 8. Le seuil par défaut, 40,
   laisse passer une photo un peu douce et refuse la photo bougée ; il se
   règle par loueur (loc_reglages.nettete_min, migration b2_07). La base
   garde la mesure de chaque photo et refuse de signer un état dont une
   vue est sous le seuil.
   ══════════════════════════════════════════════════════════════════════ */

export const NETTETE_MIN_DEFAUT = 40;

export async function mesurerNettete(fichier: Blob): Promise<number | null> {
  try {
    const image = await createImageBitmap(fichier);
    const k = Math.min(1, 512 / Math.max(image.width, image.height));
    const w = Math.max(3, Math.round(image.width * k));
    const h = Math.max(3, Math.round(image.height * k));
    const toile = document.createElement("canvas");
    toile.width = w;
    toile.height = h;
    const ctx = toile.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, w, h);
    image.close();
    const px = ctx.getImageData(0, 0, w, h).data;
    const gris = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) gris[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    let somme = 0;
    let carres = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const l = gris[i - w] + gris[i + w] + gris[i - 1] + gris[i + 1] - 4 * gris[i];
        somme += l;
        carres += l * l;
        n++;
      }
    }
    if (!n) return null;
    const moyenne = somme / n;
    return Math.round((carres / n - moyenne * moyenne) * 10) / 10;
  } catch {
    /* un format que le navigateur ne décode pas (HEIC sur un vieux navigateur) : pas de mesure, la base tranchera */
    return null;
  }
}
