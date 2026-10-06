/* recette-espace.mjs — les trois écrans client aux cinq largeurs (session A3,
   05/10/2026). Pour chaque écran et chaque largeur (390 / 768 / 1024 / 1440 /
   1700) : la page charge, aucun débordement horizontal, aucun élément plus
   large que l'écran, aucun texte anglais parmi les mots qu'on surveille, et
   une capture légère (jpeg, densité 1) dans omega/recette-a3/. Puis trois
   enchaînements : ouvrir « Approuver » et voir que le bouton reste gris sans
   commentaire quand la règle l'exige ; cliquer une valeur FILED et voir sa
   boîte surlignée dans la pièce ; reculer d'un jour sur le point.
   usage : node omega/recette-a3/recette-espace.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3010';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow)\b/;
const ECRANS = [['validations', '/espace/validations'], ['filed', '/espace/filed'], ['fournisseurs', '/espace/filed/fournisseurs'], ['a-payer', '/espace/filed/a-payer'], ['point', '/espace/point']];
const LARGEURS = [390, 768, 1024, 1440, 1700];

for (const [nom, chemin] of ECRANS) {
  for (const largeur of LARGEURS) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `a3-${nom}`, densite: 1 });
    console.log(`— ${chemin} à ${largeur}`);
    ok(await s.aller(base + chemin), 'page chargée');
    await s.dormir(600);
    const mesure = await s.evaluer(`(() => {
      const w = document.documentElement.clientWidth;
      /* un élément dans un cadre qui défile (tableau des lignes) n'est pas un débordement */
      const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
      const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
        .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
      return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent };
    })()`);
    ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
    ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
    const anglais = mesure.texte.match(ANGLAIS);
    ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
    ok(!!mesure.h1, `titre : ${mesure.h1}`);
    await s.capturer(`${dossier}${nom}-${largeur}.jpg`, { qualite: 55 });
    /* ERR_BLOCKED_BY_ORB : le script de Vercel Analytics (va.vercel-scripts.com), chargé en dev, refusé par le mandataire du conteneur */
    s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB/.test(x)).forEach((x) => ok(false, x));
    s.fermer();
  }
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-approuver', densite: 1 });
  console.log('— /espace/validations : la règle exige un commentaire');
  ok(await s.aller(base + '/espace/validations'), 'page chargée');
  await s.dormir(400);
  const avant = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-actions .r-btn')].find(b => /Approuver/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(avant === true, 'bouton « Approuver » cliqué sur la demande en retard (12 480 €, 2 approbations)');
  await s.dormir(500);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null;
    const btn = [...d.querySelectorAll('button')].find(b => /Confirmer/.test(b.textContent));
    return { titre: d.querySelector('h2')?.textContent, gris: btn?.disabled, obligatoire: /obligatoire/.test(d.textContent) }; })()`);
  ok(!!dlg, 'le dialogue s\'ouvre');
  ok(dlg?.gris === true && dlg?.obligatoire, 'sans commentaire, « Confirmer » reste gris et le champ est marqué obligatoire');
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Vérifié avec le bon de commande.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  const apres = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer/.test(b.textContent))?.disabled`);
  ok(apres === false, 'avec un commentaire, « Confirmer » s\'active');
  await s.capturer(`${dossier}validations-approuver-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const fil = await s.evaluer(`document.querySelector('.esp-detail-mobile')?.innerText || ''`);
  ok(/2 sur 2|C.est fait/.test(fil), 'la décision est appliquée en mémoire (2 sur 2, « C\'est fait »)');
  const separation = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => /Saisie par vous/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(separation === true, 'ouverture de la demande saisie par vous');
  await s.dormir(500);
  const sep = await s.evaluer(`(() => { const d = document.querySelector('.esp-detail-mobile'); return { texte: /Séparation saisie/.test(d.innerText), gris: [...d.querySelectorAll('.esp-actions .r-btn')].filter(b => /Approuver|Refuser/.test(b.textContent)).every(b => b.disabled) }; })()`);
  ok(sep.texte && sep.gris, 'la séparation saisie / approbation est affichée et les deux boutons de décision sont gris');
  await s.capturer(`${dossier}validations-separation-1440.jpg`, { qualite: 55 });
  const annuler = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-detail-mobile .esp-actions .r-btn')].find(b => /Annuler ma demande/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(annuler === true, '« Annuler ma demande » est proposé au demandeur');
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Annuler la demande/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const annulee = await s.evaluer(`/Annulée|C.est fait/.test(document.querySelector('.esp-detail-mobile')?.innerText || '')`);
  ok(annulee, 'la demande passe « Annulée » (en mémoire)');
  const deleg = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Mes délégations'); if (!c) return null;
    const b = [...c.querySelectorAll('button')].find(b => /Révoquer/.test(b.textContent)); return { donnees: (c.innerText.match(/Donnée/g) || []).length, recues: (c.innerText.match(/Reçue/g) || []).length, revocable: !!b }; })()`);
  ok(deleg && deleg.donnees >= 1 && deleg.recues >= 1 && deleg.revocable, `« Mes délégations » : ${deleg?.donnees} donnée(s), ${deleg?.recues} reçue(s), révocation proposée`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-piece', densite: 1 });
  console.log('— /espace/filed : la citation se surligne dans la pièce');
  ok(await s.aller(base + '/espace/filed'), 'page chargée');
  await s.dormir(400);
  const ref0 = await s.evaluer(`document.querySelector('#esp-dossier .esp-mono')?.textContent`);
  ok(ref0 === 'R2026-000016', `le document ouvert d'office est le bloqué le plus récent (${ref0})`);
  /* le fournisseur nouveau : déposé par Sofia, « vous » le confirmez ; identité vérifiée par VIES, « Revérifier » répond */
  const fiche = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier').innerText; return { nouveau: /Fournisseur nouveau/.test(t), vies: /Vérifiée le \\d{2}\\/\\d{2}\\/\\d{4}.* par VIES/.test(t), confirmer: !![...document.querySelectorAll('#esp-dossier .r-btn')].find(b => /Confirmer ce fournisseur/.test(b.textContent) && !b.disabled), reverifier: !![...document.querySelectorAll('#esp-dossier .r-btn')].find(b => /Revérifier auprès de VIES/.test(b.textContent)) }; })()`);
  ok(fiche.nouveau && fiche.vies && fiche.confirmer && fiche.reverifier, `fiche fournisseur : nouveau, « Vérifiée le … par VIES », « Confirmer » actif, « Revérifier » présent (${JSON.stringify(fiche)})`);
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /Confirmer ce fournisseur/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const dlgF = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, avis: /ne confirme pas ce fournisseur/.test(d.textContent) } : null; })()`);
  ok(dlgF && /Confirmer le fournisseur/.test(dlgF.titre) && dlgF.avis, `dialogue « ${dlgF?.titre} », la règle du déposant est dite`);
  const sansLevee = await s.evaluer(`(() => { const c = [...document.querySelectorAll('#esp-dossier .esp-controle')].find(e => /fournisseur\\.a_confirmer/.test(e.textContent)); return c ? !/Lever avec un motif/.test(c.textContent) && /Confirmer ce fournisseur/.test(c.textContent) : null; })()`);
  ok(sansLevee === true, 'le contrôle « fournisseur à confirmer » ne se lève pas : il propose de confirmer le fournisseur (a4_12)');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer le fournisseur/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apres = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier').innerText; return { fait: /est confirmé/.test(t), actif: /Actif/.test(t), plusBloque: !/Fournisseur nouveau/.test(t) }; })()`);
  ok(apres.fait && apres.actif && apres.plusBloque, `confirmé : le fournisseur passe actif, l'avis tombe (${JSON.stringify(apres)})`);
  await s.capturer(`${dossier}filed-fournisseur-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.esp-liste button, .esp-liste a, li button')].find(b => /R2026-000009/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const ref = await s.evaluer(`document.querySelector('#esp-dossier .esp-mono')?.textContent`);
  ok(ref === 'R2026-000009', `le dossier R2026-000009 s'ouvre depuis la liste (${ref})`);
  const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-valeur')].find(b => /IBAN/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(clic === true, 'clic sur la valeur « IBAN »');
  await s.dormir(400);
  const boite = await s.evaluer(`(() => { const b = document.querySelector('.esp-boite[data-actif="true"]'); if (!b) return null; const r = b.getBoundingClientRect(); const p = b.parentElement.getBoundingClientRect(); return { etiquette: b.textContent, x: Math.round((r.left - p.left) / p.width * 100), y: Math.round((r.top - p.top) / p.height * 100) }; })()`);
  ok(!!boite && boite.etiquette === 'IBAN', `une boîte est surlignée, étiquette « ${boite?.etiquette} », à ${boite?.x} % / ${boite?.y} % de la page`);
  const motif = await s.evaluer(`/COORD_BANC_ERR/.test(document.querySelector('#esp-dossier').innerText)`);
  ok(motif, 'le motif officiel DGFiP du contrôle échoué est affiché');
  await s.capturer(`${dossier}filed-citation-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.esp-controle-actions .r-btn')].find(b => /Lever avec un motif/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const lever = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { bloquant: /Contrôle bloquant/.test(d.textContent), gris: [...d.querySelectorAll('button')].find(b => /Lever l/.test(b.textContent))?.disabled } : null; })()`);
  ok(lever?.bloquant && lever?.gris, 'le dialogue de levée prévient que le contrôle est bloquant et exige un motif');
  await s.capturer(`${dossier}filed-lever-1440.jpg`, { qualite: 55 });
  await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`);
  await s.dormir(400);
  const appar = await s.evaluer(`(() => { const t = document.querySelector('.esp-tableau'); if (!t) return null;
    return { conformes: (t.innerText.match(/conforme/g) || []).length, boutons: [...t.querySelectorAll('button')].filter(b => /Apparier|Changer/.test(b.textContent)).length, commande: /BC-2026-0064/.test(t.innerText) }; })()`);
  ok(appar && appar.commande && appar.conformes === 3 && appar.boutons === 3, `les trois lignes sont appariées à BC-2026-0064 et conformes, chaque ligne a son bouton (${JSON.stringify(appar)})`);
  const cmd = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-actions .r-btn')].find(b => /Commande BC-2026-0064/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(cmd === true, 'le bouton de commande nomme la commande retenue et ouvre le dialogue');
  await s.dormir(400);
  const dlgCmd = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, lignes: d.querySelectorAll('.esp-fil li').length } : null; })()`);
  ok(dlgCmd && /Désigner la commande/.test(dlgCmd.titre) && dlgCmd.lignes === 3, `dialogue « ${dlgCmd?.titre} », ${dlgCmd?.lignes} lignes de commande montrées`);
  await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Déposer un document/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const depot = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, gris: [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Déposer')?.disabled, natifCache: (() => { const i = d.querySelector('input[type="file"]'); if (!i) return false; const st = getComputedStyle(i); return st.opacity === '0' && st.position === 'absolute'; })() } : null; })()`);
  ok(depot && /Déposer un document/.test(depot.titre) && depot.gris === true && depot.natifCache, 'le dépôt s\'ouvre, « Déposer » gris sans fichier, le contrôle natif (libellé anglais du navigateur) est caché');
  await s.capturer(`${dossier}filed-depot-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-lien', densite: 1 });
  console.log('— /espace/validations → /espace/filed : de la demande à son dossier');
  ok(await s.aller(base + '/espace/validations'), 'page chargée');
  await s.dormir(500);
  const choisie = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => /Lever le contrôle IBAN sur R2026-000009/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`);
  ok(choisie, 'la demande « Lever le contrôle IBAN sur R2026-000009 » est ouverte');
  await s.dormir(500);
  const apercu = await s.evaluer(`(() => { const a = document.querySelector('.esp-apercu-filed'); if (!a) return null; return { texte: a.innerText.replace(/\\s+/g, ' '), lien: a.querySelector('a')?.getAttribute('href') }; })()`);
  ok(apercu && /R2026-000009/.test(apercu.texte) && /Bloquée/.test(apercu.texte) && /Métallerie Roux/.test(apercu.texte), `aperçu du dossier dans la demande (${apercu?.texte})`);
  ok(apercu?.lien === '/espace/filed?objet=facture:R2026-000009', `lien « Ouvrir le dossier » : ${apercu?.lien}`);
  await s.capturer(`${dossier}validations-dossier-1440.jpg`, { qualite: 55 });
  ok(await s.aller(base + '/espace/filed?objet=facture:R2026-000011'), 'FILED ouvert par l\'URL d\'une demande');
  await s.dormir(900);
  const ref = await s.evaluer(`document.querySelector('#esp-dossier .esp-mono')?.textContent`);
  ok(ref === 'R2026-000011', `le dossier désigné s'ouvre d'office (${ref})`);
  ok(await s.aller(base + '/espace/filed?objet=facture:inconnue'), 'FILED ouvert avec une cible inconnue');
  await s.dormir(900);
  const introuvable = await s.evaluer(`/Document introuvable/.test(document.querySelector('.esp').innerText)`);
  ok(introuvable, 'une cible inconnue est dite, sans erreur');
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-fournisseurs', densite: 1 });
  console.log('— /espace/filed/fournisseurs : à confirmer en tête, fiche, factures');
  ok(await s.aller(base + '/espace/filed/fournisseurs'), 'page chargée');
  await s.dormir(600);
  const tete = await s.evaluer(`(() => ({ premiers: [...document.querySelectorAll('.esp-item')].slice(0, 2).map(e => e.innerText.replace(/\\s+/g, ' ')), kpi: [...document.querySelectorAll('.esp-kpi')].map(k => k.innerText.replace(/\\s+/g, ' ')) }))()`);
  ok(tete.premiers.length === 2 && tete.premiers.every(t => /^À confirmer/.test(t)), `les fournisseurs à confirmer sont en tête (${tete.premiers.join(' / ')})`);
  ok(/À confirmer 2/.test(tete.kpi.join(' | ')), `compteurs : ${tete.kpi.join(' | ')}`);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Imprimerie Vidal SAS/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const titreF = await s.evaluer(`document.querySelector('#esp-fournisseur .esp-carte-titre')?.textContent`);
  ok(titreF === 'Imprimerie Vidal SAS', `fiche ouverte : ${titreF}`);
  const fiche = await s.evaluer(`(() => { const t = document.querySelector('#esp-fournisseur').innerText; return { vies: /par VIES/.test(t), iban: /validé avec le fournisseur à sa confirmation/.test(t), facture: !!document.querySelector('#esp-fournisseur a[href*="objet=facture"]') }; })()`);
  ok(fiche.vies && fiche.iban && fiche.facture, `fiche : identité VIES, IBAN proposé, lien vers la facture (${JSON.stringify(fiche)})`);
  await s.evaluer(`[...document.querySelectorAll('#esp-fournisseur .r-btn')].find(b => /Confirmer ce fournisseur/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer le fournisseur/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apres = await s.evaluer(`(() => { const t = document.querySelector('#esp-fournisseur').innerText; return { fait: /est confirmé/.test(t), actif: /Actif/.test(t), ibanValide: /Validé/.test(t), facture: /À valider/.test(t) }; })()`);
  ok(apres.fait && apres.actif && apres.ibanValide && apres.facture, `confirmé : actif, IBAN validé, facture à valider (${JSON.stringify(apres)})`);
  await s.capturer(`${dossier}fournisseurs-confirme-1440.jpg`, { qualite: 55 });
  await s.evaluer(`(() => { const i = document.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '512448'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(400);
  const cherche = await s.evaluer(`[...document.querySelectorAll('.esp-item .esp-item-titre')].map(e => e.textContent)`);
  ok(cherche.length === 1 && cherche[0] === 'Métallerie Roux SARL', `la recherche par SIREN trouve le fournisseur (${cherche.join(', ')})`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-identifiants', densite: 1 });
  console.log('— /espace/filed : identifiants lus sur la pièce, non retenus');
  ok(await s.aller(base + '/espace/filed?objet=facture:R2026-000017'), 'page chargée sur R2026-000017');
  await s.dormir(900);
  const bloc = await s.evaluer(`(() => { const b = document.querySelector('.esp-identifiants-lus'); if (!b) return null; return { texte: b.innerText.replace(/\\s+/g, ' '), confirmer: /Confirmer la valeur lue/.test(b.textContent) }; })()`);
  ok(bloc && /SIREN lu 519803417 clé de Luhn invalide/.test(bloc.texte) && /TVA lu FR45519803417/.test(bloc.texte) && !bloc.confirmer, `valeurs lues non retenues, avec leur raison, sans « confirmer » une clé fausse (${bloc?.texte?.slice(0, 220)})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-identifiants-lus .r-btn')].find(b => /Saisir les vrais identifiants/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const saisir = async (sel, val) => s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] ${sel}'); const proto = t.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, ${JSON.stringify(val)}); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const gris = () => s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.disabled`);
  await saisir('input[inputmode="numeric"]', '519 803 415');
  await saisir('input:not([inputmode])', 'FR45519803417');
  await saisir('textarea', 'Kbis du fournisseur reçu par courriel.');
  await s.dormir(300);
  ok(await gris() === true, 'une TVA qui porte un autre SIREN laisse « Enregistrer » gris');
  await saisir('input:not([inputmode])', 'FR39519803415');
  await s.dormir(300);
  ok(await gris() === false, 'SIREN et TVA justes et cohérents : « Enregistrer » s\'allume');
  await s.capturer(`${dossier}filed-identifiants-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apres = await s.evaluer(`(() => ({ bloc: !!document.querySelector('.esp-identifiants-lus'), fiche: document.querySelector('#esp-dossier').innerText.includes('SIREN 519803415') || /SIREN\\s*519 ?803 ?415/.test(document.querySelector('#esp-dossier').innerText) }))()`);
  ok(!apres.bloc && apres.fiche, `saisis : le bloc tombe, la fiche porte le SIREN (${JSON.stringify(apres)})`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-a-payer', densite: 1 });
  console.log('— /espace/filed/a-payer : les factures validées par échéance');
  ok(await s.aller(base + '/espace/filed/a-payer'), 'page chargée');
  await s.dormir(600);
  const r = await s.evaluer(`(() => ({ kpi: [...document.querySelectorAll('.esp-kpi')].map(k => k.innerText.replace(/\\s+/g, ' ')), groupes: [...document.querySelectorAll('section.esp-carte .esp-carte-titre')].map(e => e.textContent), lignes: [...document.querySelectorAll('.esp-a-payer tbody tr')].map(t => t.innerText.replace(/\\s+/g, ' ')), avis: [...document.querySelectorAll('.esp-avis')].map(a => a.textContent) }))()`);
  ok(r.groupes.join(',') === 'En retard,Cette semaine,Ce mois-ci', `groupes dans l'ordre : ${r.groupes.join(', ')}`);
  ok(/Transports Rivière/.test(r.lignes[0] ?? '') && /de retard/.test(r.lignes[0] ?? ''), `la facture en retard vient d'abord (${r.lignes[0]})`);
  ok(r.lignes.some(l => /Cabinet Ferrand/.test(l) && /IBAN manquant/.test(l)), 'la facture sans IBAN validé le dit');
  ok(r.avis.some(a => /1 facture sans IBAN validé/.test(a)) && r.avis.some(a => /pas encore suivi/.test(a)), 'les avis : IBAN manquant, paiement non suivi');
  ok(r.lignes.length === 3, `${r.lignes.length} factures validées à payer`);
  await s.capturer(`${dossier}a-payer-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'a3-point', densite: 1 });
  console.log('— /espace/point : reculer d\'un jour');
  ok(await s.aller(base + '/espace/point'), 'page chargée');
  await s.dormir(400);
  const j1 = await s.evaluer(`document.querySelector('.esp-point-jour')?.textContent`);
  await s.evaluer(`document.querySelector('.esp-point-nav button[aria-label="Jour précédent"]').click()`);
  await s.dormir(400);
  const j2 = await s.evaluer(`document.querySelector('.esp-point-jour')?.textContent`);
  ok(j1 && j2 && j1 !== j2, `le jour change : « ${j1} » → « ${j2} »`);
  const rien = await s.evaluer(`[...document.querySelectorAll('.esp-point-rien')].length`);
  ok(rien >= 1, `${rien} section(s) « rien à signaler » la veille`);
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
