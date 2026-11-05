/* Captures de l'espace client (thème sombre, son défaut) pour l'accueil
   décalqué d'agent-ai-v1.21st.app (05/11/2026).
   Chaque cadre de la référence a son rapport d'aspect ; on capture la page
   réelle à ce rapport, en densité 2, et on l'enregistre en WebP dans
   public/accueil/.
   usage : node outils/accueil-captures.mjs [base] [nom…] */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const base = process.argv[2] || 'https://omegaai.fr';
const seuls = process.argv.slice(3);
const CADRES = [
  /* hero et les quatre onglets de « Ce que fait Omega » : 1240 / 724 */
  /* 05/11 (Teo) — le hero montre la vue d'ensemble de CASHD (après un
     essai sur les avenants de Daliro, écarté). */
  ['cashd', '/espace2/cashd', 1440, 841],
  /* 05/11 (Teo) — la section « Ce que fait Omega » : les trois façons
     d'automatiser (agents, logiciels métiers, sur mesure) et le pilotage */
  ['agents', '/espace2', 1440, 841],
  ['metiers', '/espace2/daliro/avenants', 1440, 841],
  ['sur-mesure', '/espace2/automatisations', 1440, 841],
  ['pilotage', '/espace2/validations', 1440, 841],
  /* (la section vidéo porte désormais demo.mp4, faite avec Remotion :
     PEGASE/stories/reels/video-accueil) */
  /* les trois étapes : 4 / 3 */
  ['etape-1', '/espace2/point', 1200, 900],
  ['etape-2', '/espace2/automatisations', 1200, 900],
  ['etape-3', '/espace2/validations', 1200, 900],
  /* les quatre métiers : 567 / 278 */
  ['daliro', '/espace2/daliro', 1440, 706],
  ['tamila', '/espace2/tamila', 1440, 706],
  ['lorani', '/espace2/lorani', 1440, 706],
  ['varelo', '/espace2/varelo', 1440, 706],
].filter(([n]) => !seuls.length || seuls.includes(n));

mkdirSync('public/accueil', { recursive: true });
const s = await ouvrirSession({ largeur: 1440, hauteur: 841, marque: 'accueil', densite: 1.5 });
try {
  for (const [nom, chemin, l, h] of CADRES) {
    await s.envoyer('Emulation.setDeviceMetricsOverride',
      { width: l, height: h, deviceScaleFactor: 1.5, mobile: false });
    const ok = await s.aller(base + chemin);
    await s.dormir(2500);
    const titre = await s.evaluer('location.pathname + " · " + (document.querySelector("h1")?.textContent || "").slice(0, 50)');
    const c = await s.envoyer('Page.captureScreenshot', { format: 'webp', quality: 82 });
    if (c.result?.data) {
      writeFileSync(`public/accueil/${nom}.webp`, Buffer.from(c.result.data, 'base64'));
      console.log(ok ? '✓' : '⚠', nom, titre);
    } else console.log('✗', nom);
  }
} finally { s.fermer(); }
process.exit(0);
