/* Capture des templates achetés par Teo — accueil + pages internes.
   Pour chaque site : charge l'accueil, retire les bandeaux de démo,
   capture, puis suit jusqu'à 3 liens de navigation de même origine et
   capture chaque page. Sortie : <slug>.png, <slug>-2.png, … */

import { writeFileSync } from "node:fs";

const CIBLES = [
  // vague 1 (déjà en ligne, recapturée pour avoir aussi les pages internes)
  ["proactiv", "https://proactiv-aceternity.vercel.app"],
  ["schedule", "https://schedule-template-aceternity.vercel.app/"],
  ["kinto", "https://kinto-nextjs-template.vercel.app/"],
  ["sonic", "https://sonic-nextjs-template.vercel.app/"],
  ["aspect", "https://aspect-nextjs-template.vercel.app/"],
  ["flux", "https://flux-nextjs-template.vercel.app/?banner=false"],
  ["folio", "https://folio-topaz-delta.vercel.app/"],
  // vague 2
  ["fincash", "https://fincash.demos.tailgrids.com"],
  ["hive", "https://hive-nextjs-template.vercel.app"],
  ["originx", "https://originx.demos.tailgrids.com"],
  ["gray", "https://preview.cruip.com/gray/"],
  ["synthai", "https://synthai.demos.tailgrids.com"],
  ["summit", "https://summit-nextjs.keenthemes.com"],
  ["streamline", "https://streamline-nextjs-template.vercel.app"],
  ["sage", "https://startup-template-sage.vercel.app"],
  ["saasspace", "https://saasspace.demos.tailgrids.com"],
  ["aispace", "https://aispace.demos.tailgrids.com"],
  ["appspace", "https://appspace.demos.tailgrids.com"],
  ["materialkit", "https://demos.creative-tim.com/material-kit-pro-react/#/presentation"],
  ["template07", "https://template-07-saas.vercel.app"],
  ["studio", "https://studio.tailwindui.com"],
  ["assetx", "https://assetx-ivory.vercel.app"],
];

const SORTIE = process.argv[2];
const PAGES_INTERNES = 3;
const ATTENTE = 4800;

let id = 0;
function envoie(ws, method, params = {}, timeout = 40000) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeEventListener("message", onMsg);
      reject(new Error(method + " : délai dépassé"));
    }, timeout);
    const onMsg = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== msgId) return;
      clearTimeout(t);
      ws.removeEventListener("message", onMsg);
      m.error ? reject(new Error(method + ": " + m.error.message)) : resolve(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/* bandeaux « Purchase this theme », bandeaux d'achat TailGrids/Cruip,
   cookies — tout ce qui n'a rien à faire dans une galerie commerciale */
const NETTOIE = `
  (() => {
    const motifs = ['purchase this theme','shadcnblocks','get template','buy now','download now',
                    'get pro','cookie','consent','accept all','buy this template','purchase'];
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length > 6) return;
      const t = (el.textContent || '').trim().toLowerCase();
      if (!t || t.length > 90) return;
      if (motifs.some((m) => t === m || t.includes(m))) {
        let c = el;
        for (let i = 0; i < 4 && c.parentElement && c.parentElement !== document.body; i++) c = c.parentElement;
        const r = c.getBoundingClientRect();
        // on ne masque qu'un bandeau : large et peu haut, ou en position fixe
        const fixe = getComputedStyle(c).position === 'fixed';
        if (fixe || (r.height < 130 && r.width > 400)) c.style.display = 'none';
      }
    });
    window.scrollTo(0, 0);
  })()
`;

/* liens de navigation de même origine, hors accueil et hors ancres pures */
const LIENS = `
  (() => {
    const ici = location.origin + location.pathname.replace(/\\/$/, '');
    const vus = new Set();
    const out = [];
    const zone = document.querySelector('header, nav') || document.body;
    zone.querySelectorAll('a[href]').forEach((a) => {
      let h;
      try { h = new URL(a.getAttribute('href'), location.href); } catch { return; }
      if (h.origin !== location.origin) return;
      const propre = h.origin + h.pathname.replace(/\\/$/, '') + h.hash;
      if (propre === ici || propre === location.origin) return;
      if (h.pathname === location.pathname && !h.hash) return;
      if (vus.has(propre)) return;
      vus.add(propre);
      out.push(propre);
    });
    return out.slice(0, 8);
  })()
`;

async function capture(ws, chemin) {
  const shot = await envoie(ws, "Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(chemin, Buffer.from(shot.data, "base64"));
}

const bilan = {};

for (const [nom, url] of CIBLES) {
  let ws, cible;
  const faites = [];
  try {
    const r = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
    cible = await r.json();
    ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });

    await envoie(ws, "Page.enable");
    await envoie(ws, "Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 1080, deviceScaleFactor: 2, mobile: false,
    });

    await envoie(ws, "Page.navigate", { url });
    await pause(ATTENTE);
    await envoie(ws, "Runtime.evaluate", { expression: NETTOIE });
    await pause(600);
    await capture(ws, `${SORTIE}/${nom}.png`);
    faites.push("accueil");

    const res = await envoie(ws, "Runtime.evaluate", { expression: LIENS, returnByValue: true });
    const liens = (res.result.value || []).slice(0, PAGES_INTERNES);

    let n = 2;
    for (const lien of liens) {
      try {
        await envoie(ws, "Page.navigate", { url: lien });
        await pause(ATTENTE);
        await envoie(ws, "Runtime.evaluate", { expression: NETTOIE });
        await pause(500);
        await capture(ws, `${SORTIE}/${nom}-${n}.png`);
        faites.push(lien.replace(/^https?:\/\/[^/]+/, "") || "/");
        n++;
      } catch { /* une page interne qui échoue ne doit pas perdre le site */ }
    }
    bilan[nom] = faites;
    console.log(`OK   ${nom} — ${faites.length} page(s) : ${faites.join(", ")}`);
  } catch (err) {
    bilan[nom] = faites;
    console.log(`PARTIEL ${nom} — ${faites.length} page(s) — ${err.message}`);
  } finally {
    if (ws) try { ws.close(); } catch {}
    if (cible) await fetch(`http://127.0.0.1:9222/json/close/${cible.id}`).catch(() => {});
  }
}

writeFileSync(`${SORTIE}/_bilan.json`, JSON.stringify(bilan, null, 2));
console.log("terminé");
