/* Mesure la cadence d'images pendant un défilement réel (roulette → Lenis)
   dans un Chromium avec GPU (Brave), sur une URL, en trois variantes. */
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
const URL_ = process.argv[2] || 'https://omegaai.fr/';
const PORT = 9411;
const brave = spawn('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.PROFIL}`,
  '--no-first-run', '--no-default-browser-check', '--disable-sync',
  '--window-size=1470,1000', '--window-position=0,0', 'about:blank',
], { stdio: 'ignore' });
let page;
for (let i = 0; i < 40 && !page; i++) {
  await dormir(500);
  try { const cibles = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); page = cibles.find((c) => c.type === 'page'); } catch {}
}
if (!page) { console.log('aucun onglet'); brave.kill(); process.exit(1); }
console.log('onglet ok');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const attentes = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attentes.has(d.id)) { attentes.get(d.id)(d.result); attentes.delete(d.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; attentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
await cdp('Page.enable');
await cdp('Page.navigate', { url: URL_ });
await dormir(7000);
const info = await ev('({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,toile:[document.querySelector("canvas.o-flux-toile")?.width,document.querySelector("canvas.o-flux-toile")?.height]})');
console.log('page', JSON.stringify(info));
const REC = `window.__f=[];window.__l=performance.now();window.__on=true;(function rec(){const n=performance.now();window.__f.push(Math.round(n-window.__l));window.__l=n;if(window.__on)requestAnimationFrame(rec)})();'ok'`;
const LIRE = `window.__on=false;(function(){const t=window.__f.slice(3);const s=[...t].sort((a,b)=>a-b);return {frames:t.length,fps:Math.round(1000/(t.reduce((a,b)=>a+b,0)/t.length)),p50:s[Math.floor(t.length/2)],p90:s[Math.floor(t.length*.9)],p99:s[Math.floor(t.length*.99)],sup25:t.filter(x=>x>25).length,max:Math.max(...t),y:Math.round(scrollY)}})()`;
async function defiler(depuis, crans) {
  await ev(`window.scrollTo(0,${depuis});'ok'`); await dormir(800);
  await ev(REC);
  for (let i = 0; i < crans; i++) {
    await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 500, deltaX: 0, deltaY: 120 });
    await dormir(40);
  }
  await dormir(1200);
  return await ev(LIRE);
}
async function serie(nom) {
  console.log(nom, 'idle-hero ', JSON.stringify(await (async () => { await ev('window.scrollTo(0,0);"ok"'); await dormir(500); await ev(REC); await dormir(2000); return ev(LIRE); })()));
  console.log(nom, 'hero 0→   ', JSON.stringify(await defiler(0, 30)));
  console.log(nom, 'bas 5000→ ', JSON.stringify(await defiler(5000, 30)));
}
await serie('A dpr2   ');
await ev('Object.defineProperty(window,"devicePixelRatio",{value:1,configurable:true});"ok"'); await dormir(500);
console.log('toile', JSON.stringify(await ev('[document.querySelector("canvas.o-flux-toile")?.width,document.querySelector("canvas.o-flux-toile")?.height]')));
await serie('B dpr1   ');
await ev('document.querySelector("canvas.o-flux-toile").getContext("webgl").getExtension("WEBGL_lose_context").loseContext();"ok"'); await dormir(500);
await serie('C sans   ');
ws.close(); brave.kill();
