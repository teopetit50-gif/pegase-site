// Tiroma (02/11/2026) : capture d'une page de l'espace 2 à l'échelle 1, thème sombre ou clair
// node outils/tir-capture.mjs <url> <sortie.png> [largeur] [hauteur] [dark|light] [script à jouer avant]
const { chromium } = await import(process.env.PLAYWRIGHT_MJS ?? 'playwright');
const [,, url, out, w='1500', h='920', scheme='dark', action=''] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, colorScheme: scheme });
const p = await ctx.newPage(); await p.addInitScript((s) => { try { localStorage.setItem('espace2.theme', s === 'light' ? 'clair' : 'sombre'); } catch {} }, scheme);
p.on('pageerror', e => console.error('ERREUR PAGE', e.message));
await p.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1200);
if (action) { await p.evaluate(action); await p.waitForTimeout(600); }
await p.screenshot({ path: out });
await b.close();
