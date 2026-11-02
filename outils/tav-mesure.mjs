import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, ...sel] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
for (const s of sel) console.log(s, await p.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)} flex=${c.flex} pos=${c.position} w=${c.width} minw=${c.minWidth} maxw=${c.maxWidth} disp=${c.display}`; }), s));
await b.close();
