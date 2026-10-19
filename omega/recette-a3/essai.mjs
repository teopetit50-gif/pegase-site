/* essai rapide : une capture d'un écran à une largeur. usage : node omega/recette-a3/essai.mjs /espace/validations 1440 */
import { ouvrirSession } from '../../outils/chrome.mjs';
const [chemin = '/espace/validations', l = '1440'] = process.argv.slice(2);
const largeur = Number(l);
const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'essai', densite: 1 });
const ok = await s.aller('http://localhost:3010' + chemin);
console.log('chargée', ok);
await s.dormir(800);
const sortie = `/tmp/claude-0/-home-user-pegase-site/6456e804-72f4-551d-ae1d-d433ae0e1ccf/scratchpad/essai-${chemin.replace(/\//g, '_')}-${largeur}.jpg`;
await s.capturer(sortie, { pleine: true });
console.log(sortie);
const deb = await s.evaluer('document.documentElement.scrollWidth - document.documentElement.clientWidth');
console.log('débordement horizontal', deb);
s.soucis.forEach((x) => console.log('  !', x));
s.fermer();
