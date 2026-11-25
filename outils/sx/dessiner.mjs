/* Dessine les éléments graphiques de l'accueil « sx » dans public/accueil-sx.
   Aucun fichier de la référence n'est recopié : ses images (photos de
   salariés fictifs, vignettes d'outils, logos de sociétés) sont SON actif.
   On refait ici, à la même cote, des équivalents qui sont les nôtres :
     · avatar-xx.svg  — une pastille à initiales à la place de chaque photo ;
     · outil-xxx.svg  — la vignette arrondie des outils DU CLIENT (ceux que le
                        site affiche déjà sur /integrations), glyphe simple-icons ;
     · menu.svg, chevron-*.svg, halo.svg — le burger, les chevrons, le halo.
   usage : node outils/sx/dessiner.mjs */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const si = createRequire(import.meta.url)('simple-icons');
const D = new URL('../../public/accueil-sx/', import.meta.url).pathname;
mkdirSync(D, { recursive: true });
const ecrire = (nom, svg) => writeFileSync(D + nom, svg.trim() + '\n');

/* pastilles à initiales : mêmes teintes sourdes que les fonds de la page */
const AVATARS = { ab: ['AB', '#5b6b53'], am: ['AM', '#7a5c4a'], ar: ['AR', '#4a6078'], fe: ['FE', '#8a6a3c'],
                  gm: ['GM', '#5d5876'], mm: ['MM', '#3f6f68'], pg: ['PG', '#6b6b6b'], rl: ['RL', '#7b4f5c'] };
for (const [cle, [lettres, fond]] of Object.entries(AVATARS)) {
  ecrire(`avatar-${cle}.svg`, `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="${fond}"/>
  <text x="32" y="33.5" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" letter-spacing="-0.5" fill="#fff">${lettres}</text>
</svg>`);
}

/* vignettes d'outils : même gabarit que celles de la référence (carré de 1280,35 ;
   tuile de 936,9 à coins de 220,85, fond #f5f5f5, liseré #fefefd de 63,1) */
const OUTILS = { agenda: 'siGooglecalendar', whatsapp: 'siWhatsapp', gmail: 'siGmail', sheets: 'siGooglesheets', notion: 'siNotion',
                 quickbooks: 'siQuickbooks', stripe: 'siStripe', sage: 'siSage', drive: 'siGoogledrive', shopify: 'siShopify' };
for (const [cle, nom] of Object.entries(OUTILS)) {
  const ic = si[nom];
  if (!ic) throw new Error('icône absente : ' + nom);
  const cote = 400, e = cote / 24, o = (1280.35 - cote) / 2;
  ecrire(`outil-${cle}.svg`, `
<svg xmlns="http://www.w3.org/2000/svg" width="1280.35" height="1280.35" viewBox="0 0 1280.35 1280.35" fill="none">
  <rect x="171.73" y="171.73" width="936.90" height="936.90" rx="220.85" fill="#f5f5f5" stroke="#fefefd" stroke-width="63.1"/>
  <path transform="translate(${o} ${o}) scale(${e})" d="${ic.path}" fill="#${ic.hex}"/>
</svg>`);
}

/* vignettes des IA (25/11, Teo : « mets les gros noms de l'IA, on travaille
   avec eux ») : même gabarit que les vignettes d'outils, mais un MOT-SYMBOLE
   typographique à l'encre de la page, jamais le logo de la marque (pas de
   droit d'usage ; règle maison). Corps calé sur la longueur du nom. */
const IA = { claude: 'Claude', anthropic: 'Anthropic', chatgpt: 'ChatGPT', openai: 'OpenAI', gemini: 'Gemini',
             google: 'Google', mistral: 'Mistral AI', lechat: 'Le Chat', deepmind: 'DeepMind', gpt: 'GPT' };
for (const [cle, nom] of Object.entries(IA)) {
  const corps = Math.min(230, Math.round(1350 / nom.length));
  ecrire(`ia-${cle}.svg`, `
<svg xmlns="http://www.w3.org/2000/svg" width="1280.35" height="1280.35" viewBox="0 0 1280.35 1280.35" fill="none">
  <rect x="171.73" y="171.73" width="936.90" height="936.90" rx="220.85" fill="#f5f5f5" stroke="#fefefd" stroke-width="63.1"/>
  <text x="640.175" y="652" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="${corps}" font-weight="600" letter-spacing="${(-corps * 0.035).toFixed(1)}" fill="#121212">${nom}</text>
</svg>`);
}

ecrire('menu.svg', `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5" stroke="FILL" stroke-width="1.5" stroke-linecap="round"/>
</svg>`.replace('FILL', process.env.SX_MENU || '#121212'));
for (const [nom, c] of [['chevron-clair', '#ffffff'], ['chevron-sombre', '#121212']]) {
  ecrire(nom + '.svg', `
<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" overflow="visible" style="display:block" width="5.99863" height="9.98588" viewBox="0 0 5.99863 9.98588" fill="none">
  <path d="M1 1l4 3.993-4 3.993" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);
}
ecrire('halo.svg', `
<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" overflow="visible" style="display:block" width="1582" height="1184.5" viewBox="0 0 1582 1184.5" fill="none">
  <defs><filter id="f" x="0" y="0" width="1582" height="1184.5" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="56"/></filter></defs>
  <ellipse cx="791" cy="592" rx="679" ry="480" fill="#F5F5F2" filter="url(#f)"/>
</svg>`);
console.log('dessiné dans', D);
