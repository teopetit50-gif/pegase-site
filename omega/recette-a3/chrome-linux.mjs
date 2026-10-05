/* chrome-linux.mjs — la même session CDP que outils/chrome.mjs, avec la
   découverte du binaire pour LINUX (session A3, 05/10/2026).

   outils/chrome.mjs ne cherche Chromium que dans le cache Playwright de
   macOS et /Applications ; sur la machine de recette (conteneur Linux), le
   binaire préinstallé est sous PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers).
   Ce fichier n'est qu'un décalque : trouverChrome() lit cette variable et
   ces chemins, le reste (CDP sans dépendance, screencast acquitté, aller()
   qui attend la page) est repris tel quel. Demande au coordinateur :
   ajouter ces chemins à outils/chrome.mjs et supprimer ce fichier. */
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
import { readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function trouverChrome() {
  const racines = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', join(homedir(), '.cache/ms-playwright'), join(homedir(), 'Library/Caches/ms-playwright')].filter(Boolean);
  for (const cache of racines) {
    if (!existsSync(cache)) continue;
    const dossiers = readdirSync(cache).filter((d) => d.startsWith('chromium')).sort().reverse();
    for (const d of dossiers) {
      for (const sous of ['chrome-linux/headless_shell', 'chrome-linux/chrome',
                          'chrome-headless-shell-mac-arm64/chrome-headless-shell',
                          'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(cache, d, sous);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (existsSync(p)) return p;
  throw new Error('Aucun Chromium trouvé.');
}

export async function ouvrirSession({ largeur = 1440, hauteur = 900, port = 9300 + Math.floor(Math.random() * 400),
                                      screencast = true, marque = 'site', densite = 2, flags = [] } = {}) {
  const binaire = trouverChrome();
  const proc = spawn(binaire, [
    `--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox', '--disable-gpu',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    ...flags,
    `--user-data-dir=/tmp/cdp-${marque}-${port}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', () => {});

  let version;
  for (let i = 0; i < 100; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }
    catch { await dormir(250); }
  }
  if (!version) { proc.kill(); throw new Error(`Chromium n'a pas répondu sur ${port}`); }

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const attente = new Map();
  const soucis = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method === 'Runtime.exceptionThrown')
      soucis.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || '').slice(0, 200));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error')
      soucis.push('ERR ' + d.params.entry.text.slice(0, 200));
    if (d.method === 'Network.loadingFailed' && !/ERR_ABORTED/.test(d.params.errorText || ''))
      soucis.push('NET ' + d.params.errorText);
    if (d.method === 'Page.screencastFrame')
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: d.params.sessionId }, sessionId: d.sessionId }));
    if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); }
  };
  const brut = (methode, params = {}, sessionId) =>
    new Promise((r) => { const i = ++id; attente.set(i, r); ws.send(JSON.stringify({ id: i, method: methode, params, sessionId })); });
  const { result: { targetId } } = await brut('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await brut('Target.attachToTarget', { targetId, flatten: true });
  const envoyer = (methode, params) => brut(methode, params, sessionId);
  for (const d of ['Page', 'Runtime', 'Log', 'Network']) await envoyer(d + '.enable', {});
  if (screencast) await envoyer('Page.startScreencast', { format: 'jpeg', quality: 5, everyNthFrame: 1 });
  await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: densite, mobile: largeur < 768 });

  const evaluer = async (expression) =>
    (await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

  const aller = async (url, { signe = null, plafond = 60 } = {}) => {
    await envoyer('Page.navigate', { url });
    const test = signe || `document.readyState === 'complete' && !!document.querySelector('h1,h2') && document.body.scrollHeight > 400`;
    for (let essai = 0; essai < plafond; essai++) {
      await dormir(400);
      if (await evaluer(test)) { await dormir(600); return true; }
    }
    return false;
  };

  /** Capture PNG (densité 1 pour des fichiers légers) → chemin. */
  const capturer = async (chemin, { pleine = false, qualite = 70 } = {}) => {
    const { writeFileSync } = await import('node:fs');
    const params = { format: 'jpeg', quality: qualite, captureBeyondViewport: pleine };
    if (pleine) {
      const h = await evaluer('document.documentElement.scrollHeight');
      params.clip = { x: 0, y: 0, width: largeur, height: Math.min(h, 6000), scale: 1 };
    }
    const r = await envoyer('Page.captureScreenshot', params);
    writeFileSync(chemin, Buffer.from(r.result.data, 'base64'));
    return chemin;
  };

  const fermer = () => { try { ws.close(); } catch {} proc.kill(); };
  return { envoyer, evaluer, aller, capturer, fermer, soucis, dormir };
}
