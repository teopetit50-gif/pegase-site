/** Relevé typographique d'UNE page à UNE largeur.
 *
 *    node paliers.mjs <url> <largeur>
 *
 * Un processus Chrome par appel, volontairement : enchaîner cinq largeurs dans
 * le même processus finit par le faire tomber, et surtout il faut RECHARGER à
 * chaque largeur — redimensionner puis mesurer donne des valeurs fausses sur
 * tout site qui pose ses tailles au chargement.
 *
 * Lancer la même boucle sur la référence et sur notre page, puis poser les
 * deux séries côte à côte : c'est le tableau de concordance.
 *
 *    for w in 390 768 1024 1440 1700; do node paliers.mjs "$URL" $w; done
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
if (!url) { console.error('usage: node paliers.mjs <url> <largeur>'); process.exit(1); }

const s = await ouvrirSession({ largeur, marque: 'paliers' });
try {
  const pret = await s.aller(url);
  if (!pret) {
    console.log(`── ${largeur}px  ${url}\n  ⚠ page jamais prête (serveur éteint, ou qui recompile encore)`);
  } else {
    const releve = await s.evaluer(`(()=>{
      /* Un sélecteur peut attraper un homonyme — le h1 du pied de page, par
         exemple. On renvoie donc le début du texte, pour vérifier ce qu'on
         a mesuré avant de retenir la valeur. */
      const lire=(sel)=>{const e=document.querySelector(sel); if(!e) return '—';
        const c=getComputedStyle(e), b=e.getBoundingClientRect();
        return c.fontSize.replace('px','')+'/'+c.lineHeight.replace('px','')
          +' ls'+c.letterSpacing.replace('px','').replace('normal','0')
          +' g'+c.fontWeight
          +' l'+Math.round(b.width)
          +'  « '+(e.textContent||'').trim().slice(0,26)+' »';};
      const de=document.documentElement;
      const col=document.querySelector('.container, [class*="container"]')
             || document.querySelector('main > *');
      return JSON.stringify({
        h1: lire('h1'),
        h2: lire('main h2, h2'),
        corps: lire('main p, p'),
        colonne: col ? Math.round(col.getBoundingClientRect().width) : '—',
        hauteurPage: document.body.scrollHeight,
        debordement: de.scrollWidth - de.clientWidth,
      }, null, 1);
    })()`);
    console.log(`── ${largeur}px  ${url}`);
    console.log(releve);
    if (s.soucis.length) console.log('soucis :', s.soucis.slice(0, 5).join(' | '));
  }
} finally {
  s.fermer();
}
process.exit(0);
