/* Comparateur du décalque « sx » : marche la référence et notre page côte à
   côte, élément par élément (le balisage est porté mécaniquement, donc le
   même arbre des deux côtés), et sort chaque écart de style calculé, de
   position ou d'attribut.

   usage : node outils/sx/compare.mjs <largeur> [options]
     --ref URL       (défaut : la référence en ligne)
     --nous URL      (défaut : http://localhost:3111/)
     --frais         relit la référence au lieu du cache /tmp/sx/ref-<l>.json
     --max N         nombre d'écarts détaillés affichés (défaut 40)
     --bloc NOM      ne détaille qu'un bloc (nav, hero, s1…s11, pied)
     --prop P        ne détaille qu'une propriété
     --sans-rect     ignore les écarts de position/taille (phase « contenu »)
     --sans-texte    n'aligne pas sur le texte (contenu Omega en place)

   Les deux pages sont mises dans le même état avant la mesure : défilées
   de haut en bas (les apparitions se déclenchent), remontées, animations
   finies ou figées à zéro. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from '../chrome.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : (args.splice(i, 2)[1]); };
const drapeau = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const REF = opt('--ref', 'https://synnax-ai-native-software-landing-template-v1.21st.app/');
const NOUS = opt('--nous', 'http://localhost:3111/');
const MAX = Number(opt('--max', 40));
const BLOC = opt('--bloc', null);
const PROP = opt('--prop', null);
const FRAIS = drapeau('--frais');
const SANS_RECT = drapeau('--sans-rect');
const largeur = Number(args[0] || 1440);
const hauteur = largeur < 600 ? 844 : 900;
const CACHE = '/tmp/sx/mesures';
mkdirSync(CACHE, { recursive: true });

const PROPS = ['display', 'position', 'float', 'visibility', 'opacity', 'z-index', 'box-sizing',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variation-settings', 'font-feature-settings',
  'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line', 'text-indent',
  'white-space', 'text-wrap', 'text-overflow', 'word-break', 'vertical-align',
  'transform', 'filter', 'backdrop-filter', 'mix-blend-mode', 'clip-path', 'mask-image',
  'box-shadow', 'outline-style', 'outline-width', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'align-content',
  'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio', 'object-fit', 'object-position',
  'fill', 'stroke', 'stroke-width', 'cursor', 'pointer-events', 'user-select',
  'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
  'animation-name', 'animation-duration', 'list-style-type', 'table-layout', 'border-collapse', 'isolation', 'inset-inline-start', 'top', 'left', 'right', 'bottom'];
const PSEUDO = ['content', 'display', 'position', 'width', 'height', 'top', 'left', 'right', 'bottom', 'background-color',
  'background-image', 'border-top-width', 'border-top-color', 'border-left-width', 'border-left-color', 'border-top-left-radius',
  'opacity', 'transform', 'color', 'box-shadow', 'z-index'];

const RELEVER = `(async () => {
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  /* défiler pour déclencher les apparitions, puis remonter */
  const H = () => document.documentElement.scrollHeight;
  /* attendre l'hydratation : les hachures de marge n'existent qu'une fois le JavaScript monté */
  for (let i = 0; i < 80 && !document.querySelector('.synnax-navbar-sticky ~ div span.absolute.inset-x-0'); i++) await dormir(250);
  await dormir(400);
  for (let y = 0; y < H(); y += Math.round(innerHeight * 0.5)) { scrollTo(0, y); await dormir(260); }
  for (const b of document.querySelectorAll('[data-in-view="false"]')) { b.scrollIntoView({ block: 'center' }); for (let i = 0; i < 12 && b.getAttribute('data-in-view') !== 'true'; i++) await dormir(150); }
  scrollTo(0, H()); for (let i = 0; i < 20 && !document.querySelector('footer.sgf[data-in="true"]'); i++) await dormir(150);
  await dormir(300);
  scrollTo(0, 0); dispatchEvent(new Event('scroll')); await dormir(1100);
  for (const a of document.getAnimations()) {
    try {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
      if (t.iterations === Infinity || t.endTime === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
    } catch (e) {}
  }
  dispatchEvent(new Event('resize')); await dormir(700);
  const PROPS = ${JSON.stringify(PROPS)}, PSEUDO = ${JSON.stringify(PSEUDO)};
  const barre = document.querySelector('.synnax-navbar-sticky');
  if (!barre) return { erreur: 'barre introuvable', titre: document.title };
  const env = barre.parentElement, pied = document.querySelector('footer.sgf');
  /* Chrome sans écran rend parfois une valeur périmée (0px) pour la marge « auto » d'un élément flex
     tant qu'aucune remise en page n'a eu lieu : on en force une, des deux côtés. */
  { const r = env.parentElement, d = r.style.display; r.style.display = 'block'; void r.offsetHeight; r.style.display = d; void r.offsetHeight; }
  const noms = ['nav', 'filets', 'hero', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11'];
  const blocs = [...env.children].map((e, i) => [noms[i] || 'x' + i, e]);
  if (pied) blocs.push(['pied', pied]);
  const arr = (v) => Math.round(v * 2) / 2;
  const sortie = {};
  for (const [nom, racine] of blocs) {
    const liste = [];
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_ELEMENT);
    let el = racine;
    while (el) {
      if (el.tagName === 'STYLE') { el = w.nextNode(); continue; }
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const st = PROPS.map((p) => cs.getPropertyValue(p)).join('¦');
      const ps = [];
      for (const q of ['::before', '::after']) {
        const c = getComputedStyle(el, q);
        const ct = c.getPropertyValue('content');
        ps.push(ct === 'none' || ct === 'normal' ? '' : PSEUDO.map((p) => c.getPropertyValue(p)).join('¦'));
      }
      const at = [...el.attributes].filter((a) => /^(data-|aria-|hidden$|inert$|role$|type$)/.test(a.name))
        .map((a) => a.name + '=' + a.value).sort().join('¦');
      let txt = '';
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
      liste.push({ t: el.tagName.toLowerCase(), c: (el.getAttribute('class') || '').slice(0, 70), x: txt.trim().slice(0, 40),
        r: [arr(r.left), arr(r.top + scrollY), arr(r.width), arr(r.height)], s: st, p: ps, a: at });
      el = w.nextNode();
    }
    sortie[nom] = liste;
  }
  return { blocs: sortie, largeurPage: document.documentElement.scrollWidth, hauteurPage: H(), iw: innerWidth };
})()`;

async function relever(url, marque) {
  const s = await ouvrirSession({ largeur, hauteur, marque, densite: 1 });
  try {
    if (!await s.aller(url, { plafond: 90 })) throw new Error('page jamais prête : ' + url);
    await s.dormir(1500);
    const r = await s.evaluer(RELEVER);
    if (!r || r.erreur) throw new Error('relevé vide sur ' + url + ' : ' + JSON.stringify(r));
    return r;
  } finally { s.fermer(); }
}

const fRef = `${CACHE}/ref-${largeur}.json`;
let ref;
if (!FRAIS && existsSync(fRef)) ref = JSON.parse(readFileSync(fRef, 'utf8'));
else { ref = await relever(REF, 'sxref'); writeFileSync(fRef, JSON.stringify(ref)); }
const nous = await relever(NOUS, 'sxnous');
writeFileSync(`${CACHE}/nous-${largeur}.json`, JSON.stringify(nous));

/* valeurs équivalentes à l'écran, écrites autrement après un second passage par le minifieur */
const equiv = (v) => String(v).replace(/\b0px 0px\b/g, '0% 0%').replace('matrix(1, 0, 0, 1, 0, 0)', 'none');
const ecarts = [];
const parProp = new Map();
console.log(`\n══ ${largeur} px — page : réf ${ref.largeurPage}×${ref.hauteurPage} · nous ${nous.largeurPage}×${nous.hauteurPage}`);
console.log('bloc     éléments réf/nous   avec écart');
for (const nom of Object.keys(ref.blocs)) {
  const A = ref.blocs[nom], B = nous.blocs[nom] || [];
  let n = Math.min(A.length, B.length), touches = 0, decale = -1;
  for (let i = 0; i < n; i++) {
    const a = A[i], b = B[i];
    if (a.t !== b.t) { decale = i; break; }
    const liste = [];
    if (a.s !== b.s) {
      const sa = a.s.split('¦'), sb = b.s.split('¦');
      PROPS.forEach((p, k) => {
        /* une toile WebGL pas encore dessinée n'a pas de rapport d'aspect : état de chargement, pas un écart */
        if (a.t === 'canvas' && p === 'aspect-ratio') return;
        if (sa[k] !== sb[k] && equiv(sa[k]) !== equiv(sb[k])) liste.push([p, sa[k], sb[k]]);
      });
    }
    ['::before', '::after'].forEach((q, k) => {
      if (a.p[k] !== b.p[k]) {
        const pa = a.p[k] ? a.p[k].split('¦') : [], pb = b.p[k] ? b.p[k].split('¦') : [];
        if (!pa.length || !pb.length) liste.push([q, pa.length ? 'présent' : 'absent', pb.length ? 'présent' : 'absent']);
        else PSEUDO.forEach((p, j) => { if (pa[j] !== pb[j]) liste.push([q + ' ' + p, pa[j], pb[j]]); });
      }
    });
    if (!SANS_RECT) ['x', 'y', 'l', 'h'].forEach((p, k) => { if (Math.abs(a.r[k] - b.r[k]) > 0.5) liste.push(['rect.' + p, a.r[k], b.r[k]]); });
    if (a.a !== b.a) liste.push(['attributs', a.a.slice(0, 160), b.a.slice(0, 160)]);
    if (liste.length) {
      touches++;
      for (const [p, va, vb] of liste) {
        parProp.set(p, (parProp.get(p) || 0) + 1);
        ecarts.push({ bloc: nom, i, el: a.t + (a.c ? '.' + a.c.split(' ').slice(0, 2).join('.') : ''), txt: a.x, p, ref: va, nous: vb });
      }
    }
  }
  console.log(`${nom.padEnd(8)} ${String(A.length).padStart(5)} / ${String(B.length).padEnd(5)}      ${String(touches).padStart(5)}${decale >= 0 ? `   ⚠ arbres décalés à l'élément ${decale} : <${A[decale].t}> ≠ <${B[decale].t}>` : ''}${A.length !== B.length ? '   ⚠ nombre différent' : ''}`);
}
writeFileSync(`${CACHE}/ecarts-${largeur}.json`, JSON.stringify(ecarts));
const tri = [...parProp.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\n${ecarts.length} écarts sur ${new Set(ecarts.map((e) => e.bloc + e.i)).size} éléments. Par propriété :`);
console.log(tri.slice(0, 30).map(([p, n]) => `${p} ${n}`).join(' · '));
let vus = ecarts.filter((e) => (!BLOC || e.bloc === BLOC) && (!PROP || e.p === PROP));
/* ne montrer qu'un exemple par (propriété, valeurs) : sinon la même cause occupe tout l'écran */
const deja = new Map();
const uniques = [];
for (const e of vus) { const k = e.p + '|' + e.ref + '|' + e.nous; if (!deja.has(k)) { deja.set(k, 0); uniques.push(e); } deja.set(k, deja.get(k) + 1); }
console.log(`\n${uniques.length} causes distinctes${BLOC ? ' dans ' + BLOC : ''}${PROP ? ' pour ' + PROP : ''} :`);
for (const e of uniques.slice(0, MAX)) {
  const k = e.p + '|' + e.ref + '|' + e.nous;
  const c = (v) => String(v).length > 70 ? String(v).slice(0, 70) + '…' : v;
  console.log(`  [${e.bloc}#${e.i}] ${e.el.slice(0, 50)} «${e.txt.slice(0, 18)}» ${e.p}: ${c(e.ref)} → ${c(e.nous)}  (×${deja.get(k)})`);
}
process.exit(0);
