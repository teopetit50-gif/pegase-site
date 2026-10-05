// Simulation de numérisation : rastérise un PDF natif (pdftoppm), le dégrade (ImageMagick), puis le remballe en PDF image.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PDFDocument } from 'pdf-lib';

export const QUALITES = {
  bonne: { dpi: 200, rotation: 0.3, bruit: 0.4, flou: 0, contraste: 0, jpeg: 80, gris: false, taches: 0 },
  moyenne: { dpi: 150, rotation: 1.2, bruit: 1.2, flou: 0.6, contraste: -10, jpeg: 60, gris: true, taches: 2 },
  faible: { dpi: 100, rotation: 2.5, bruit: 2.5, flou: 1.1, contraste: -25, jpeg: 40, gris: true, taches: 5 },
  illisible: { dpi: 55, rotation: 6, bruit: 6, flou: 2.8, contraste: -55, jpeg: 18, gris: true, taches: 14 },
};

export function verifierOutils() {
  for (const outil of ['pdftoppm', 'convert']) {
    try { execFileSync('which', [outil], { stdio: 'ignore' }); } catch { throw new Error(`Outil manquant : ${outil} (installer poppler-utils et imagemagick)`); }
  }
}

export async function scanner(pdfNatif, qualite, alea, { couleurPapier } = {}) {
  const q = QUALITES[qualite];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-scan-'));
  const entree = path.join(dossier, 'natif.pdf');
  fs.writeFileSync(entree, pdfNatif);
  execFileSync('pdftoppm', ['-r', String(q.dpi), '-png', entree, path.join(dossier, 'page')]);
  const pages = fs.readdirSync(dossier).filter((n) => n.startsWith('page') && n.endsWith('.png')).sort();
  const docNatif = await PDFDocument.load(pdfNatif, { updateMetadata: false });
  const largeursNatives = docNatif.getPages().map((p) => p.getWidth());
  const doc = await PDFDocument.create();
  doc.setProducer(`Numériseur fictif ${alea.choix(['ScanMaster 300', 'OfficeJet Pro', 'MFP-4420', 'DocuFlow'])}`);
  for (const nom of pages) {
    const png = path.join(dossier, nom); const jpg = png.replace(/\.png$/, '.jpg');
    const rot = (alea.reel() * 2 - 1) * q.rotation;
    const papier = couleurPapier ?? alea.choix(['#fdfdf8', '#f7f4ea', '#fbfbfb', '#f2efe4']);
    const args = [png, '-background', papier, '-rotate', rot.toFixed(2), '+repage'];
    if (q.gris) args.push('-colorspace', 'Gray');
    if (q.flou) args.push('-blur', `0x${q.flou}`);
    if (q.contraste) args.push('-brightness-contrast', `${Math.round(q.contraste / 3)}x${q.contraste}`);
    if (q.bruit) args.push('-attenuate', String(q.bruit / 3), '+noise', 'Gaussian');
    // Taches / plis : disques translucides et une bande claire
    for (let i = 0; i < q.taches; i++) {
      const cx = alea.entier(20, 800); const cy = alea.entier(20, 1100); const r = alea.entier(4, 30);
      args.push('-fill', `rgba(${alea.entier(40, 120)},${alea.entier(30, 90)},${alea.entier(10, 40)},${(alea.reel() * 0.35 + 0.05).toFixed(2)})`, '-draw', `circle ${cx},${cy} ${cx + r},${cy}`);
    }
    if (qualite === 'illisible') {
      args.push('-fill', 'rgba(255,255,255,0.85)', '-draw', `rectangle 0,${alea.entier(100, 500)} 2000,${alea.entier(520, 900)}`);
      args.push('-motion-blur', '0x6+35', '-resize', '70%');
    }
    args.push('-quality', String(q.jpeg), '-sampling-factor', '4:2:0', jpg);
    execFileSync('convert', args);
    const octetsJpg = fs.readFileSync(jpg);
    if (octetsJpg[0] !== 0xff || octetsJpg[1] !== 0xd8) throw new Error(`convert n'a pas produit un JPEG pour ${nom} (${octetsJpg.length} octets, en-tête ${octetsJpg.subarray(0, 8).toString("hex")}) ; arguments : ${args.join(" ")}`);
    // Copie dans un tampon dédié : pdf-lib lit l'ArrayBuffer sous-jacent depuis l'offset 0, ce qui casse avec le pool de Buffer de Node.
    const image = await doc.embedJpg(Uint8Array.from(octetsJpg));
    const largeurPage = largeursNatives[pages.indexOf(nom)] ?? 595.28;
    const echelle = largeurPage / image.width;
    const page = doc.addPage([largeurPage, image.height * echelle]);
    page.drawImage(image, { x: 0, y: 0, width: largeurPage, height: image.height * echelle });
  }
  const sortie = await doc.save();
  fs.rmSync(dossier, { recursive: true, force: true });
  return { pdf: sortie, pages: pages.length };
}
