/* ══════════════════════════════════════════════════════════════════════
   BOUTONS MORTS — 15/09/2026, à la demande de Teo (« vérifie que chaque
   bouton emmène bien au bon endroit »).

   Ce que les autres contrôles ne voient pas : un <button> qui n'est relié
   à rien. Un lien se contrôle sur son href (crawl statique) ; un bouton,
   non — React pose ses écouteurs à la RACINE, donc `getEventListeners`
   sur l'élément ne rend rien même quand le bouton marche très bien.

   La seule preuve honnête est donc EMPIRIQUE : on clique, et on regarde
   si quelque chose bouge — l'URL, la taille du DOM, l'attribut du bouton
   (aria-expanded / aria-selected / data-*), le focus, le défilement.
   Rien qui bouge = signalé « MUET », à regarder à la main.

   Les boutons `type="submit"` et ceux d'un formulaire sont SAUTÉS : on ne
   poste pas de vraies demandes depuis une sonde.

   ⚠ LE MENSONGE DE LA PREMIÈRE VERSION, gardé en mémoire. Elle appelait
   `e.click()`. Elle a déclaré MUETS les quatre onglets métier de FRONTD
   et 62 boutons de /tarifs — tous en parfait état. `element.click()` ne
   produit ni `pointerdown` ni `mousedown` ; or Radix (onglets, segmentés,
   menus) ACTIVE au pointeur, pas au clic. La sonde envoie donc de vrais
   événements souris par CDP, aux coordonnées du bouton.

   CE QU'ELLE NE SAIT TOUJOURS PAS FAIRE : elle clique dans l'ordre du
   DOM sans revenir à l'état initial entre deux boutons. Un segmenté déjà
   ACTIF ne change rien quand on le reclique — c'est juste, et ça se lit
   « MUET ». Un MUET est donc une PISTE à vérifier à la main, jamais un
   verdict : on rejoue le bouton seul, sur une page fraîche.

   Usage : node outils/sonde-boutons-morts.mjs <largeur> <url...>
   ══════════════════════════════════════════════════════════════════════ */
import { ouvrirSession } from './chrome.mjs';

const largeur = Number(process.argv[2] || 1440);
const urls = process.argv.slice(3);

const RELEVE = `(() => {
  const l = [];
  document.querySelectorAll('button, [role="button"]').forEach((e, i) => {
    e.setAttribute('data-sonde', 'b' + i);
    const r = e.getBoundingClientRect();
    l.push({
      id: 'b' + i,
      t: (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 42) || (e.getAttribute('aria-label') || '(sans libellé)'),
      submit: e.type === 'submit' || !!e.closest('form'),
      visible: r.width > 0 && r.height > 0,
    });
  });
  return JSON.stringify(l);
})()`;

const etat = `(() => JSON.stringify({
  url: location.href,
  dom: document.documentElement.outerHTML.length,
  y: Math.round(scrollY),
  attrs: [...document.querySelectorAll('[aria-expanded],[aria-selected],[data-etat],[data-actif],[aria-checked],[data-state]')]
    .map(e => e.getAttribute('aria-expanded') + e.getAttribute('aria-selected') + e.getAttribute('data-etat') + e.getAttribute('data-actif') + e.getAttribute('aria-checked') + e.getAttribute('data-state')).join(''),
  focus: document.activeElement?.getAttribute?.('data-sonde') || '',
}))()`;

for (const url of urls) {
  const s = await ouvrirSession({ largeur, hauteur: 900, screencast: false, densite: 1, flags: ['--disable-webgl'] });
  const ok = await s.aller(url);
  if (!ok) { console.log('PAGE MUETTE ' + url); s.fermer(); continue; }
  const liste = JSON.parse(await s.evaluer(RELEVE));
  const muets = [];
  let testes = 0;
  for (const b of liste) {
    if (b.submit || !b.visible) continue;
    const avant = await s.evaluer(etat);
    const pos = await s.evaluer(`(() => {
      const e = document.querySelector('[data-sonde="${b.id}"]');
      if (!e) return '';
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return '';
      return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
    })()`);
    if (!pos) continue;
    const { x, y } = JSON.parse(pos);
    for (const type of ['mousePressed', 'mouseReleased'])
      await s.envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await s.dormir(450);
    const apres = await s.evaluer(etat);
    testes++;
    if (avant === apres) muets.push(b.t);
    /* on referme ce qu'on vient d'ouvrir pour ne pas empiler les panneaux */
    if (avant !== apres && JSON.parse(avant).url === JSON.parse(apres).url
        && (await s.evaluer(`document.querySelector('[data-sonde="${b.id}"]')?.getAttribute('aria-expanded') === 'true'`))) {
      for (const type of ['mousePressed', 'mouseReleased'])
        await s.envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      await s.dormir(200);
    }
    if (JSON.parse(avant).url !== JSON.parse(apres).url) { await s.aller(url); await s.evaluer(RELEVE); }
  }
  console.log(`\n${url}  —  ${testes} boutons cliqués, ${muets.length} à vérifier`);
  for (const m of muets) console.log('   RIEN NE BOUGE  ' + m);
  if (s.soucis.length) console.log('   (console) ' + [...new Set(s.soucis)].slice(0, 4).join(' | '));
  s.fermer();
}
