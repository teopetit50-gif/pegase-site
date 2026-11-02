// Tiroma (02/11/2026) : recette aux cinq largeurs (390, 768, 1024, 1440, 1700) des six sous-pages ; signale toute page qui défile de côté.
// Serveur `npx next dev -p 3100` lancé ; PLAYWRIGHT_MJS = chemin de playwright si besoin.
const { chromium } = await import(process.env.PLAYWRIGHT_MJS ?? 'playwright');
const b = await chromium.launch();
for (const chemin of ['', '/creneaux', '/creneaux?creneau=9101', '/fauteuils', '/plans', '/pilotage', '/reglages', '/reglages?section=general']) {
  for (const w of [390, 768, 1024, 1440, 1700]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto('http://localhost:3100/espace2/tiroma' + chemin, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const trop = de.scrollWidth - de.clientWidth;
      let pire = null;
      if (trop > 0) for (const e of document.querySelectorAll('body *')) { const x = e.getBoundingClientRect(); if (x.right > de.clientWidth + 1 && (!pire || x.right > pire.r)) pire = { r: Math.round(x.right), c: e.className?.toString().slice(0, 60), t: e.tagName }; }
      return { trop, pire };
    });
    if (r.trop > 0) console.log(chemin || '/', w, 'déborde de', r.trop, JSON.stringify(r.pire));
    await p.close();
  }
}
console.log('fin');
await b.close();
