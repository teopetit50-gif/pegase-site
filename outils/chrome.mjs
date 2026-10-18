/** Trouve un Chromium pilotable et ouvre une session CDP.
 *  Aucune dépendance : Node ≥ 22 expose WebSocket en global, on parle CDP
 *  directement. Ni puppeteer ni playwright à installer.
 */
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
import { readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Le binaire de Playwright est versionné dans son chemin : le découvrir,
 *  jamais le coder en dur — il change à chaque mise à jour.
 *
 *  05/10/2026 — LINUX. Les sessions de recette distantes tournent dans un
 *  conteneur Linux où Chromium est préinstallé sous PLAYWRIGHT_BROWSERS_PATH
 *  (/opt/pw-browsers, binaires `chrome-linux/headless_shell` et
 *  `chrome-linux/chrome`) ; ce fichier ne connaissait que le cache macOS et
 *  /Applications et levait « Aucun Chromium trouvé ». La variable est lue
 *  d'abord, puis les caches Playwright des deux systèmes, puis les
 *  emplacements système. */
export function trouverChrome() {
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    join(homedir(), '.cache/ms-playwright'),
    join(homedir(), 'Library/Caches/ms-playwright'),
  ].filter(Boolean);
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    const dossiers = readdirSync(cache)
      .filter((d) => d.startsWith('chromium'))
      .sort()
      .reverse();
    for (const d of dossiers) {
      for (const sous of ['chrome-linux/headless_shell',
                          'chrome-linux/chrome',
                          'chrome-headless-shell-mac-arm64/chrome-headless-shell',
                          'chrome-headless-shell-mac-x64/chrome-headless-shell',
                          'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(cache, d, sous);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]) if (existsSync(p)) return p;
  throw new Error("Aucun Chromium trouvé (ni PLAYWRIGHT_BROWSERS_PATH, ni cache Playwright, ni /Applications, ni /usr/bin).");
}

/** Sous Linux en root (conteneur), Chromium refuse de démarrer sans
 *  --no-sandbox ; et sans carte graphique, --disable-gpu évite une attente
 *  inutile. Et quand la machine sort par un mandataire (HTTPS_PROXY posé,
 *  cas du conteneur de recette), Chromium ne le lit pas de lui-même en
 *  headless : sans --proxy-server il sort en direct et tombe sur un
 *  certificat qu'il ne connaît pas (ERR_CERT_AUTHORITY_INVALID) ; on le lui
 *  donne, en laissant localhost en direct. Ailleurs, rien n'est ajouté. */
function drapeauxSysteme() {
  if (process.platform !== 'linux') return [];
  const root = typeof process.getuid === 'function' && process.getuid() === 0;
  const mandataire = process.env.HTTPS_PROXY || process.env.https_proxy;
  return [
    ...(root ? ['--no-sandbox'] : []),
    '--disable-gpu',
    ...(mandataire ? [`--proxy-server=${mandataire}`, '--proxy-bypass-list=<local>;localhost;127.0.0.1'] : []),
  ];
}

/** Ouvre une session CDP attachée à un onglet neuf.
 *  `screencast` par défaut : sans production d'images, aucune transition CSS
 *  n'avance et tout ce qui est révélé au défilement se mesure à zéro.
 *
 *  `flags` et `densite` — 11/09/2026. L'accueil peint son fond « Silk » en
 *  WebGL, et le WebGL de ce Chromium passe par swiftshader, donc par le
 *  processeur. À la densité 2 il repeint 2880 x 1800 pixels à chaque image :
 *  le thread principal sature, et le PREMIER `Runtime.evaluate` ne rend
 *  jamais la main — symptôme identique à une page qui n'a pas chargé
 *  (« unsettled top-level await »), alors que la page va très bien.
 *  Pour recetter l'accueil : `flags: ['--disable-webgl']`, et la densité 1
 *  si la page reste lourde. Le fond Silk ne se photographie alors plus, ce
 *  qui est sans conséquence pour tout le reste de la page. */
export async function ouvrirSession({ largeur = 1440, hauteur = 900,
                                      port = 9300 + Math.floor(Math.random() * 400),
                                      screencast = true, marque = 'site',
                                      densite = 2, flags = [] } = {}) {
  const binaire = trouverChrome();
  const proc = spawn(binaire, [
    `--remote-debugging-port=${port}`, '--headless=new',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    ...drapeauxSysteme(),
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
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck',
                               params: { sessionId: d.params.sessionId }, sessionId: d.sessionId }));
    if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); }
  };

  const brut = (methode, params = {}, sessionId) =>
    new Promise((r) => { const i = ++id; attente.set(i, r); ws.send(JSON.stringify({ id: i, method: methode, params, sessionId })); });

  /* Le screencast doit être ACQUITTÉ image par image. Sans accusé de
     réception, Chrome cesse d'en produire au bout de quelques trames : le
     compositeur se fige, et `Page.captureScreenshot` attend alors un commit
     qui n'arrivera jamais — l'appel ne rend plus la main. Le symptôme est
     silencieux (« unsettled top-level await »), et il ne se déclenche que
     sur une page assez lente pour remplir la file avant la 1re capture :
     tout marche en local, tout bloque sur une page distante. */

  const { result: { targetId } } = await brut('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await brut('Target.attachToTarget', { targetId, flatten: true });
  const envoyer = (methode, params) => brut(methode, params, sessionId);

  for (const d of ['Page', 'Runtime', 'Log', 'Network']) await envoyer(d + '.enable', {});
  if (screencast) await envoyer('Page.startScreencast', { format: 'jpeg', quality: 5, everyNthFrame: 1 });
  await envoyer('Emulation.setDeviceMetricsOverride',
    { width: largeur, height: hauteur, deviceScaleFactor: densite, mobile: largeur < 768 });

  /** Évalue une expression dans la page ; `await` de haut niveau accepté. */
  const evaluer = async (expression) =>
    (await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))
      .result?.result?.value;

  /** Naviguer PUIS attendre que la page soit réellement là.
   *  Un délai fixe ment : un serveur de développement qui recompile rend un
   *  document vide, on le mesure, et on croit avoir trouvé un défaut.
   *  `signe` est une expression évaluée dans la page ; par défaut, la présence
   *  d'un titre et d'un peu de contenu. */
  const aller = async (url, { signe = null, plafond = 40 } = {}) => {
    await envoyer('Page.navigate', { url });
    /* `readyState === 'complete'` est dans le signal par défaut depuis le
       11/09/2026, et ce n'est pas du zèle : sur une page DISTANTE, le
       contenu est là avant la feuille de style. Une mesure prise dans cet
       intervalle voit 58 règles au lieu de 965 — donc aucun `hidden`, aucun
       `lg:`, deux variantes d'un composant affichées en même temps et un
       débordement horizontal de 250 px. On croit alors avoir cassé la page
       alors qu'on l'a photographiée nue. En local ça n'arrive jamais, d'où
       le piège : le défaut n'apparaît qu'une fois en ligne, et une fois sur
       trois. */
    const test = signe
      || `document.readyState === 'complete'
          && !!document.querySelector('h1,h2') && document.body.scrollHeight > 400`;
    for (let essai = 0; essai < plafond; essai++) {
      await dormir(400);
      if (await evaluer(test)) {
        await dormir(600);       // laisser les polices et la mise en page finir
        return true;
      }
    }
    return false;
  };

  /** Capture (jpeg par défaut, léger) → chemin écrit. `pleine` : toute la
   *  page, plafonnée à 6 000 px de haut. 05/10/2026, posé pour la recette des
   *  écrans client (omega/recette-a3). */
  const capturer = async (chemin, { pleine = false, qualite = 70, format = 'jpeg' } = {}) => {
    const { writeFileSync } = await import('node:fs');
    const params = { format, captureBeyondViewport: pleine };
    if (format === 'jpeg') params.quality = qualite;
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
