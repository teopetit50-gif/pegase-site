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
  // vague 3 (15/09/2026) — les 42 templates PAYANTS de 21st.dev absents du catalogue
  ["northstar", "https://daliagency-anonymized.vercel.app/"],
  ["vertex", "https://vertex-one-lovat.vercel.app"],
  ["saleshook", "https://saleshookai-landing-page-2-v1.21st.app"],
  ["qronos", "https://qronos-ai-agent-scheduler-template-v1.21st.app"],
  ["pulse", "https://pulse-ai-one-ashy.vercel.app/"],
  ["intellune", "https://intellune-ruixen-com.vercel.app"],
  ["nguyen", "https://nguyen-ai-workspace-saas-landing-page-v1.21st.app"],
  ["guild", "https://guild-landing-kit-qa-v1.21st.app"],
  ["smileflow", "https://smileflow-premium-next-js-16-dental-practice-templ-v1.21st.app"],
  ["personalkit", "https://personal-site-kit-v2.21st.app"],
  ["t3code", "https://t3code-cinematic-dark-saas-landing-page-template-v2.21st.app"],
  ["evolv", "https://evolv-ai.nextjsshop-preview.workers.dev/"],
  ["agentai", "https://agent-ai.nextjsshop-preview.workers.dev/"],
  ["mosa", "https://mosa-ai.nextjsshop-preview.workers.dev/"],
  ["deo", "https://deo-ecommerce.nextjsshop-preview.workers.dev/"],
  ["cypon", "https://cypon-analytics.nextjsshop-preview.workers.dev/"],
  ["bookmark", "https://bookmarkdesign.nextjsshop-preview.workers.dev/"],
  ["shopnext", "https://ecommerce-template.nextjsshop-preview.workers.dev/"],
  ["omegatpl", "https://omega.nextjsshop-preview.workers.dev/"],
  ["nexflow", "https://nexflow.nextjsshop-preview.workers.dev/"],
  ["anox", "https://anox.nextjsshop-preview.workers.dev/"],
  ["nexuscloud", "https://zensend.nextjsshop-preview.workers.dev/"],
  ["aceai", "https://aceai.nextjsshop-preview.workers.dev/"],
  ["fleetops", "https://fleetops.nextjsshop-preview.workers.dev/"],
  ["bookify", "https://bookify.nextjsshop-preview.workers.dev/"],
  ["thinkscope", "https://thinkcope.nextjsshop-preview.workers.dev/"],
  ["deepflow", "https://deepflow.nextjsshop-preview.workers.dev/"],
  ["persofolio", "https://personalportfolio.nextjsshop-preview.workers.dev/"],
  ["connectsphere", "https://connectsphere.nextjsshop-preview.workers.dev/"],
  ["devfolio", "https://preview.cruip.com/devfolio/"],
  ["openpro", "https://preview.cruip.com/open-pro/"],
  ["docs", "https://preview.cruip.com/docs/"],
  ["simple", "https://preview.cruip.com/simple/"],
  ["meridian", "https://meridian-nextjs-template.vercel.app/"],
  ["lumen", "https://lumen-nextjs-template.vercel.app/"],
  ["metafi", "https://metafi-nextjs-template.vercel.app/"],
  ["skyagent", "https://agent-magicui.vercel.app/"],
  ["blogmagic", "https://blog-magicui.vercel.app/"],
  ["minimalfolio", "https://minimal-portfolio-website-template.vercel.app/"],
  ["nodus", "https://notus-agent-marketing-template.vercel.app/"],
  ["lume", "https://template-lume.vercel.app/"],
  ["daliagents", "https://red.daliagents.com/"],
  // vague 3 bis — les 20 landings « inclus dans l'abonnement » retenues
  ["outline", "https://21st-outline-preview.vercel.app"],
  ["aura", "https://21st-aura-svelte-preview-jdpo1k26v-larsen3.vercel.app"],
  ["mobilesaas", "https://mobile-saas-template-v1.21st.app"],
  ["homeguardian", "https://homeguardian-v1.21st.app"],
  ["studiova", "https://studiova-agency-business-bootstrap-template-v2.21st.app"],
  ["launchui", "https://launch-ui-v1.21st.app"],
  ["saascn", "https://saas-landing.techwithanirudh.com/"],
  ["chatdeck", "https://chatdeck-v1.21st.app"],
  ["payload", "https://payload-marketing-v1.21st.app"],
  ["vetra", "https://vetra-app.vercel.app/"],
  ["luro", "https://luro.heyshreyas.com/"],
  ["saaslanding", "https://saas-landing-template-v1.21st.app"],
  ["nexacore", "https://hirael.com/embed/templates/nexacore"],
  ["asme", "https://hirael.com/embed/templates/asme"],
  ["velorah", "https://hirael.com/embed/templates/velorah"],
  ["rivr", "https://hirael.com/embed/templates/rivr"],
  ["usdhalo", "https://hirael.com/embed/templates/usd-halo"],
  ["mindloop", "https://hirael.com/embed/templates/mindloop"],
  ["agencylanding", "https://hirael.com/embed/templates/agency-landing"],
  ["creativestudio", "https://hirael.com/embed/templates/creative-studio"],
];

const SORTIE = process.argv[2];
/* 15/09/2026 — 3e argument facultatif : la liste des slugs à (re)faire, séparés
   par des virgules. Sans lui, tout le catalogue est recapturé. */
const FILTRE = process.argv[3] ? new Set(process.argv[3].split(",")) : null;
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
    /* 15/09/2026 — la vague 3 a ramené trois pastilles que la liste d'août
       ne couvrait pas : « Made by Nextjsshop » (posée sur les 18 aperçus
       du marchand), « Buy Template Now $50 » et « Get This Template ». */
    const motifs = ['purchase this theme','shadcnblocks','get template','buy now','download now',
                    'get pro','cookie','consent','accept all','buy this template','purchase',
                    'made by nextjsshop','buy template','get this template','nextjsshop'];
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length > 6) return;
      const t = (el.textContent || '').trim().toLowerCase();
      if (!t || t.length > 90) return;
      if (motifs.some((m) => t === m || t.includes(m))) {
        /* 15/09/2026 — la remontée montait 4 crans SANS S'ARRÊTER et
           dépassait la pastille : « Made by Nextjsshop » est un
           div.fixed de 230×42, mais quatre parents plus haut on tombait
           sur le conteneur de 11 526 px de haut, que le garde-fou de
           taille refusait ensuite. On s'arrête donc au premier ancêtre
           sorti du flux — c'est lui, le bandeau. */
        let c = el;
        const horsFlux = (n) => {
          const p = getComputedStyle(n).position;
          return p === 'fixed' || p === 'sticky';
        };
        if (!horsFlux(c)) {
          for (let i = 0; i < 4 && c.parentElement && c.parentElement !== document.body; i++) {
            c = c.parentElement;
            if (horsFlux(c)) break;
          }
        }
        const r = c.getBoundingClientRect();
        // un bandeau : sorti du flux, ou large et peu haut
        if (horsFlux(c) || (r.height < 130 && r.width > 400)) c.style.display = 'none';
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
const bilanFond = {};

for (const [nom, url] of CIBLES) {
  if (FILTRE && !FILTRE.has(nom)) continue;
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
    /* le fond réel de la page décide `theme` dans donnees.ts — mesuré, pas deviné */
    const fond = await envoie(ws, "Runtime.evaluate", {
      expression: `(() => { const c = getComputedStyle(document.body).backgroundColor;
        const m = c.match(/\\d+/g) || [255,255,255];
        const l = (0.2126*m[0] + 0.7152*m[1] + 0.0722*m[2]) / 255;
        return JSON.stringify({ c, theme: l < 0.45 ? "sombre" : "clair", titre: document.title });
      })()`, returnByValue: true,
    }).catch(() => null);
    if (fond?.result?.value) bilanFond[nom] = JSON.parse(fond.result.value);

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
writeFileSync(`${SORTIE}/_fonds.json`, JSON.stringify(bilanFond, null, 2));
console.log("terminé");
