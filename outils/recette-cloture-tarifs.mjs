/** Recette de la clôture de /tarifs (carte calendrier, 15/09/2026)
 *
 *    node outils/recette-cloture-tarifs.mjs [origine]
 *
 * Aux cinq largeurs : on RECHARGE (jamais un redimensionnement), on attend
 * que l'agenda ait répondu, on mesure la carte, on compte les mois rendus et
 * les jours ouverts, on clique le premier jour ouvert et on relit la phrase
 * de résumé — puis une capture de la section dans la fenêtre.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const origine = process.argv[2] || 'http://localhost:3000';
const dossier = 'captures/cloture-tarifs';
mkdirSync(dossier, { recursive: true });

const LARGEURS = [390, 768, 1024, 1440, 1700];

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'cloture', densite: 1 });
  try {
    const ok = await s.aller(`${origine}/tarifs`, {
      /* le signe d'une page prête ICI, c'est l'agenda rendu : sans lui on
         mesurerait l'état « Chargement de l'agenda… » et on conclurait que
         le calendrier n'existe pas */
      signe: `document.readyState === 'complete'
              && !!document.querySelector('#reserver [data-reveal] [role="grid"], #reserver [data-reveal] table')`,
      plafond: 60,
    });
    if (!ok) { console.log(`${largeur}  ⚠ agenda jamais rendu`); continue; }

    await s.evaluer(`document.querySelector('#reserver').scrollIntoView({block:'start'}); window.scrollBy(0,-90)`);
    await s.dormir(900);

    const avant = await s.evaluer(`(() => {
      const carte = document.querySelector('#reserver [data-reveal]');
      const r = carte.getBoundingClientRect();
      const grilles = carte.querySelectorAll('table, [role="grid"]').length;
      const jours = [...carte.querySelectorAll('button')].filter(b => /^\\d+$/.test(b.textContent.trim()));
      const ouverts = jours.filter(b => !b.disabled && b.getAttribute('aria-disabled') !== 'true');
      const resume = carte.querySelector('p.first-letter\\\\:uppercase, p')?.innerText || '';
      return {
        carte: Math.round(r.width), gauche: Math.round(r.left),
        grilles, jours: jours.length, ouverts: ouverts.length,
        premier: ouverts[0]?.textContent.trim() || null,
        deborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        boutons: [...carte.querySelectorAll('.r-btn')].map(b => b.textContent.trim()),
      };
    })()`);

    /* cliquer le premier jour ouvert, puis relire la phrase de résumé */
    const apres = await s.evaluer(`(async () => {
      const carte = document.querySelector('#reserver [data-reveal]');
      const b = [...carte.querySelectorAll('button')]
        .filter(x => /^\\d+$/.test(x.textContent.trim()) && !x.disabled)[0];
      if (!b) return { resume: null };
      b.click();
      await new Promise(r => setTimeout(r, 400));
      const ps = [...carte.querySelectorAll('p')].map(p => p.innerText.trim());
      return { resume: ps.find(t => /créneau/.test(t)) || ps.join(' | ').slice(0, 200) };
    })()`);

    const { result } = await s.envoyer('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${dossier}/${largeur}.png`, Buffer.from(result.data, 'base64'));

    console.log(
      `${String(largeur).padStart(4)}  carte ${avant.carte}px (x=${avant.gauche})  mois ${avant.grilles}  ` +
      `jours ${avant.ouverts}/${avant.jours} ouverts  débord ${avant.deborde}px  ` +
      `boutons [${avant.boutons.join(' · ')}]`);
    console.log(`      résumé après clic sur le ${avant.premier} : ${apres.resume}`);
    const err = s.soucis.filter(x => !/favicon/.test(x));
    if (err.length) console.log('      ⚠ ' + err.slice(0, 4).join('\n      ⚠ '));
  } finally { s.fermer(); }
}
