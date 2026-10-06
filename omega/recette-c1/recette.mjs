/* recette.mjs — le nouvel espace client /espace2 (session C1, 06/10/2026).

   Pour chaque écran, aux cinq largeurs (390 / 768 / 1024 / 1440 / 1700),
   en clair puis en sombre (prefers-color-scheme émulé) : capture de la
   page entière, débordement horizontal, erreurs de la console. Puis, à
   390 et 1440 : axe-core (WCAG 2.1 A et AA) sur la page, sur un menu
   ouvert, sur la palette ⌘K et sur la fenêtre « Noter un paiement » ;
   et le clavier : Tab part du lien d'évitement puis entre dans la barre
   latérale, Ctrl+K et F ouvrent la palette, Entrée ouvre le menu « … »,
   Échap rend le focus ; à 390, le tiroir de navigation s'ouvre et se
   ferme (capture tiroir-390-*).
   Un écart axe « serious » ou « critical » fait échouer.

   usage : node omega/recette-c1/recette.mjs [origine] [dossier des captures] */
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3100';
const sortie = process.argv[3] ?? 'omega/recette-c1/captures';
mkdirSync(sortie, { recursive: true });
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const ECRANS = [
  ['accueil', '/espace2'],
  ['validations', '/espace2/validations'],
  ['point', '/espace2/point'],
  ['activite', '/espace2/activite'],
  ['reglages', '/espace2/reglages'],
  ['filed', '/espace2/filed?objet=facture:R2026-000016'],
  ['a-payer', '/espace2/filed/a-payer'],
  ['fournisseurs', '/espace2/filed/fournisseurs'],
  ['comptabilite', '/espace2/filed/comptabilite'],
  ['filed-electronique', '/espace2/filed?objet=facture:R2026-000014'],
  ['varelo', '/espace2/varelo'],
  ['tavaro', '/espace2/tavaro'],
  ['tiroma', '/espace2/tiroma'],
  ['tamila', '/espace2/tamila'],
  ['lorani', '/espace2/lorani'],
  ['daliro', '/espace2/daliro'],
];
const LARGEURS = [390, 768, 1024, 1440, 1700];

const analyser = (s, cible) => s.evaluer(`(async () => {
  if (!window.axe) { ${axe}; }
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);
const juger = (nom, v) => {
  const graves = (v ?? []).filter((x) => x.impact === 'serious' || x.impact === 'critical');
  ok(!graves.length, `axe ${nom} : ${graves.length} écart grave${graves.length > 1 ? 's' : ''}${(v ?? []).length - graves.length ? ` (+${(v ?? []).length - graves.length} mineurs)` : ''}`);
  for (const x of v ?? []) console.log(`      ${x.impact} ${x.id} ×${x.n} — ${x.aide} — ${x.cibles.join(' | ')}`);
};
const touche = async (s, key, code, modifiers = 0, keyCode = 0) => {
  await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: keyCode });
  await s.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: keyCode });
  await s.dormir(350);
};
const focus = (s) => s.evaluer(`(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 60) : null; })()`);

for (const largeur of LARGEURS) {
  for (const theme of ['clair', 'sombre']) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'recette-c1', densite: 1 });
    await s.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme === 'sombre' ? 'dark' : 'light' }] });
    console.log(`\n— ${largeur} px, ${theme}`);
    try {
      for (const [nom, chemin] of ECRANS) {
        const pret = await s.aller(base + chemin, { signe: `document.readyState === 'complete' && !!document.querySelector('.v2 main h1')` });
        ok(pret, `${nom} se rend`);
        await s.dormir(500);
        const deb = await s.evaluer(`document.documentElement.scrollWidth - window.innerWidth`);
        ok(deb <= 0, `${nom} : aucun débordement horizontal (${deb} px)`);
        await s.capturer(`${sortie}/${nom}-${largeur}-${theme}.jpg`, { pleine: true, qualite: 72 });

        if (largeur === 390 || largeur === 1440) {
          juger(`${nom} page`, await analyser(s, `document.querySelector('.v2')`));
        }
      }

      if ((largeur === 390 || largeur === 1440)) {
        /* le menu « … » d'une ligne, au clavier */
        await s.aller(base + '/espace2/filed/a-payer', { signe: `!!document.querySelector('.v2-tableau tbody tr')` });
        await s.evaluer(`document.querySelector('.v2-tableau [aria-label^="Actions sur"]').focus()`);
        await touche(s, 'Enter', 'Enter', 0, 13);
        await s.dormir(300);
        ok(await s.evaluer(`!!document.querySelector('[role=menu]')`), 'Entrée ouvre le menu « … »');
        ok(/Noter un paiement/.test((await focus(s)) ?? ''), `le focus est sur le premier choix (${await focus(s)})`);
        await s.capturer(`${sortie}/menu-${largeur}-${theme}.jpg`, { qualite: 72 });
        juger('menu ouvert', await analyser(s, `document.querySelector('.v2-popover')`));
        await touche(s, 'Escape', 'Escape', 0, 27);
        ok(/^Actions sur/.test((await focus(s)) ?? ''), `Échap ferme et rend le focus au déclencheur (${await focus(s)})`);

        /* la fenêtre « Noter un paiement » */
        await s.evaluer(`[...document.querySelectorAll('.v2-tableau button')].find(b => /Payer/.test(b.textContent)).click()`);
        await s.dormir(500);
        ok(await s.evaluer(`!!document.querySelector('.v2-modale [slot=title], .v2-modale h2')`), 'la fenêtre « Noter un paiement » s\'ouvre');
        await s.capturer(`${sortie}/paiement-${largeur}-${theme}.jpg`, { qualite: 72 });
        juger('fenêtre paiement', await analyser(s, `document.querySelector('.v2-voile')`));
        await s.evaluer(`document.querySelector('.v2-modale button[type=submit]').click()`);
        await s.dormir(900);
        ok(await s.evaluer(`!document.querySelector('.v2-modale') && /Paiement noté/.test(document.querySelector('.v2-toasts')?.textContent ?? '')`), 'le paiement est noté (exemple) et un toast le dit');
        await s.capturer(`${sortie}/toast-${largeur}-${theme}.jpg`, { qualite: 72 });

        /* la palette, au clavier */
        await s.aller(base + '/espace2');
        await touche(s, 'k', 'KeyK', 2, 75);
        await s.dormir(400);
        ok(await s.evaluer(`!!document.querySelector('.v2-palette') && document.activeElement?.tagName === 'INPUT'`), 'Ctrl+K ouvre la palette, le champ a le focus');
        await s.envoyer('Input.insertText', { text: 'payer' });
        await s.dormir(400);
        const n = await s.evaluer(`document.querySelectorAll('.v2-palette [role=menuitem]').length`);
        ok(n >= 1 && n < 10, `la frappe filtre la liste (${n} résultat${n > 1 ? 's' : ''} pour « payer »)`);
        await s.capturer(`${sortie}/palette-${largeur}-${theme}.jpg`, { qualite: 72 });
        juger('palette', await analyser(s, `document.querySelector('.v2-voile')`));
        await touche(s, 'Enter', 'Enter', 0, 13);
        await s.dormir(1200);
        ok(await s.evaluer(`location.pathname === '/espace2/filed/a-payer'`), `Entrée ouvre le premier résultat (${await s.evaluer('location.pathname')})`);

        /* F ouvre aussi la palette (hors d'un champ) */
        await s.aller(base + '/espace2');
        await touche(s, 'f', 'KeyF', 0, 70);
        await s.dormir(400);
        ok(await s.evaluer(`!!document.querySelector('.v2-palette')`), 'la touche F ouvre la palette');
        await touche(s, 'Escape', 'Escape', 0, 27);
        await s.dormir(300);
        ok(await s.evaluer(`!document.querySelector('.v2-palette')`), 'Échap ferme la palette');

        /* Tab : du lien d'évitement à la navigation */
        await s.aller(base + '/espace2');
        const vus = [];
        for (let i = 0; i < 6; i++) { await touche(s, 'Tab', 'Tab', 0, 9); vus.push(await focus(s)); }
        ok(vus[0] === 'Aller au contenu', `Tab : d'abord « Aller au contenu » (${vus.join(' → ')})`);
        ok(vus.some((v) => /^(Organisation|Ouvrir la navigation)/.test(v ?? '')), 'Tab entre dans la navigation');

        if (largeur === 390) {
          /* le tiroir de navigation */
          await s.evaluer(`document.querySelector('[aria-label="Ouvrir la navigation"]').click()`);
          await s.dormir(600);
          ok(await s.evaluer(`!!document.querySelector('.v2-tiroir .v2-lien')`), 'le bouton menu ouvre le tiroir de navigation');
          await s.capturer(`${sortie}/tiroir-${largeur}-${theme}.jpg`, { qualite: 72 });
          juger('tiroir', await analyser(s, `document.querySelector('.v2-voile')`));
          await touche(s, 'Escape', 'Escape', 0, 27);
          await s.dormir(400);
          ok(await s.evaluer(`!document.querySelector('.v2-tiroir')`), 'Échap ferme le tiroir');
        }

        /* le menu du compte (« … » en bas de la barre latérale) */
        if (largeur === 390) { await s.evaluer(`document.querySelector('[aria-label="Ouvrir la navigation"]').click()`); await s.dormir(600); }
        await s.evaluer(`[...document.querySelectorAll('[aria-label="Menu du compte"]')].pop().click()`);
        await s.dormir(400);
        await s.capturer(`${sortie}/compte-${largeur}-${theme}.jpg`, { qualite: 72 });
        juger('menu compte', await analyser(s, `document.querySelector('.v2-popover')`));
      }
      const soucis = s.soucis.filter((x) => !/favicon|_vercel|va\.vercel|Failed to load resource/.test(x));
      ok(!soucis.length, `console propre${soucis.length ? ' : ' + soucis.slice(0, 3).join(' / ') : ''}`);
    } finally {
      s.fermer();
    }
  }
}
console.log(`\n${echecs ? '✗' : '✓'} ${echecs} échec${echecs > 1 ? 's' : ''}`);
process.exit(echecs ? 1 : 0);
