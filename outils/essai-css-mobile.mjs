// Banc d'essai CSS sans build : charge une page EN LIGNE à 390, y injecte un CSS local, mesure et photographie écran par écran.
// node outils/essai-css-mobile.mjs /secteurs/btp app/secteurs/btp/mobile.css sortie [de] [à]   (« - » = sans CSS ; ATTENTE=ms entre deux écrans)
// Le resize après injection force GSAP/ScrollTrigger à recalculer : sans lui, les blocs animés en bas de page restent vides (24/09).
// Charge une page de prod à 390, injecte un CSS local (ou rien), mesure et photographie.
// node essai.mjs /secteurs/btp chemin.css sortie
import { ouvrirSession } from './chrome.mjs';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const [p, css, out, depuis, jusqua] = process.argv.slice(2);
const s = await ouvrirSession({ largeur: 390, hauteur: 844, densite: 1, screencast: true });
await s.aller('https://omegaai.fr' + p);
if (css && css !== '-') await s.evaluer(`(() => { const st = document.createElement('style'); st.textContent = ${JSON.stringify(readFileSync(css, 'utf8'))}; document.head.appendChild(st); dispatchEvent(new Event('resize')); })()`); await s.dormir(800);
await s.evaluer(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 300)); })()`);
const m = await s.evaluer(`(() => { const main = document.querySelector('main');
  const f = (sel) => [...main.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().height > 0).map(e => parseFloat(getComputedStyle(e).fontSize)).join(',');
  const trop = [...main.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && r.width < innerWidth * 1.5; }).length;
  return { h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, h1: f('h1'), h2: f('h2'), h3: f('h3'), trop }; })()`);
console.log(JSON.stringify(m));
if (out) {
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const H = m.h; let i = 0;
  const a = depuis ? +depuis : 0, b = jusqua ? +jusqua : 99;
  for (let y = 0; y < H; y += 844) {
    if (i >= a && i <= b) {
      await s.evaluer(`scrollTo(0, ${y})`); await s.dormir(+(process.env.ATTENTE || 650));
      const { result } = await s.envoyer('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
      writeFileSync(`${out}/${String(i).padStart(2, '0')}.jpg`, Buffer.from(result.data, 'base64'));
    }
    i++;
  }
  console.log(i, 'écrans');
}
s.fermer(); process.exit(0);
