/* non-regression.mjs — le parcours de chaque écran de l'espace client,
   indépendant du design (session A3, 06/10/2026).

   Pour la migration vers le nouveau tableau de bord (/espace2, ouvrier C1) :
   la même suite se joue contre /espace et contre /espace2 et dit ce qui
   MANQUE au nouveau design. Elle ne lit aucune classe CSS : seulement ce
   qu'un utilisateur voit et ce qu'un lecteur d'écran annonce — le titre de
   la page (h1), les textes clés, le NOM ACCESSIBLE des commandes (aria-label,
   sinon le texte), les dialogues (role="dialog" et leur titre), le clavier,
   axe-core. Données d'exemple, sans connexion, rien n'est écrit nulle part.

   Pour chaque écran :
     · la page répond et porte son titre ;
     · chaque texte clé est dans la page ;
     · chaque action est présente, visible, active, et ATTEIGNABLE AU
       CLAVIER (atteinte en parcourant la page à la touche Tab) ;
     · une action « dialogue » ouvre un dialogue au bon titre, le focus y
       entre, Échap le ferme et rend le focus à la commande ;
     · une action « lien » mène à la bonne page SOUS LE MÊME PRÉFIXE (un lien
       de /espace2 qui renverrait vers /espace est un manque) ;
     · axe (WCAG 2.1 A et AA) sans écart grave à 1440 et 390 ; pas de
       débordement horizontal à 390.

   usage : node omega/recette-a3/non-regression.mjs [préfixe] [origine]
           préfixe : /espace (défaut) ou /espace2 ; origine : http://localhost:3010 (défaut)
           NR_ECRANS=filed,varelo pour ne jouer que certains écrans.
   Sortie : le détail, puis le bilan par écran ; code 1 s'il manque quelque chose. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const prefixe = (process.argv[2] ?? '/espace').replace(/\/$/, '');
const base = (process.argv[3] ?? 'http://localhost:3010').replace(/\/$/, '');
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const filtre = process.env.NR_ECRANS ? new Set(process.env.NR_ECRANS.split(',')) : null;

/* ——— le parcours attendu, écran par écran (relevé sur /espace le 06/10) ———
   textes : présents dans la page (sans la casse) ;
   actions : { nom, dialogue } ouvre un dialogue dont le titre commence par `dialogue` ;
             { nom, lien } mène à `lien` (chemin sous le préfixe) ;
             { nom } doit seulement être présent et atteignable.
   `nom` : le début du nom accessible de la commande. */
const ECRANS = [
  {
    cle: 'validations', chemin: '/validations', titre: 'À valider',
    textes: ['Ce qui attend votre décision', 'En retard', 'Montant en attente', 'Mes délégations', 'Le dossier'],
    actions: [
      { nom: 'Approuver', dialogue: 'Approuver' },
      { nom: 'Refuser', dialogue: 'Refuser' },
      { nom: 'Modifier', dialogue: 'Modifier la demande' },
      { nom: 'Déléguer', dialogue: 'Déléguer ma décision' },
      { nom: 'Décider en lot' },
      { nom: 'Ouvrir le dossier', lien: '/filed' },
    ],
  },
  {
    cle: 'filed', chemin: '/filed?objet=facture:R2026-000016', titre: 'Documents reçus',
    textes: ['Bloquées', 'En litige', 'Valeurs lues', 'Contrôles', 'Fil du document', 'Fournisseur nouveau', 'Vérifiée le'],
    actions: [
      { nom: 'Déposer un document', dialogue: 'Déposer un document' },
      { nom: 'Corriger une valeur', dialogue: 'Corriger une valeur' },
      { nom: 'Rattacher à un fournisseur', dialogue: 'Rattacher à un fournisseur' },
      { nom: 'Confirmer ce fournisseur', dialogue: 'Confirmer le fournisseur' },
      { nom: 'Revérifier auprès de VIES' },
      { nom: 'Fournisseurs', lien: '/filed/fournisseurs' },
      { nom: 'À payer', lien: '/filed/a-payer' },
      { nom: 'Boîte de réception', lien: '/filed/boite' },
    ],
  },
  {
    cle: 'filed-identifiants', chemin: '/filed?objet=facture:R2026-000017', titre: 'Documents reçus',
    textes: ['Identifiants lus sur la pièce, non retenus', 'clé de Luhn invalide'],
    actions: [
      { nom: 'Saisir les vrais identifiants', dialogue: 'Saisir les identifiants du fournisseur' },
      { nom: 'Voir sur la pièce' },
    ],
  },
  {
    /* la facture électronique (fiche d'A4, 06/10) : provenance, valeurs qui font foi, litige, onglets.
       « Refuser » n'y est pas : R2026-000014 est validée (le lien ne s'offre qu'à valider ou bloquée). */
    cle: 'filed-electronique', chemin: '/filed?objet=facture:R2026-000014', titre: 'Documents reçus',
    textes: ['Facture électronique', 'du fichier'],
    actions: [
      { nom: 'Ouvrir un litige', dialogue: 'Ouvrir un litige' },
      { nom: 'Cycle de vie' },
      { nom: 'Écritures' },
      { nom: 'Comptabilité', lien: '/filed/comptabilite' },
    ],
  },
  {
    cle: 'comptabilite', chemin: '/filed/comptabilite', titre: 'Comptabilité',
    textes: ['Fichier des écritures comptables (FEC) — achats', 'Il ne remplace pas le FEC complet de votre comptabilité', 'Les comptes de FILED', 'par défaut'],
    actions: [
      { nom: 'Exporter le FEC' },
      { nom: 'Modifier le compte', dialogue: 'Modifier le compte' },
      { nom: 'Documents reçus', lien: '/filed' },
      { nom: 'À payer', lien: '/filed/a-payer' },
    ],
  },
  {
    cle: 'boite', chemin: '/filed/boite', titre: 'Boîte de réception',
    textes: ['Vos fournisseurs envoient leurs factures à', 'Nouveaux', 'Écartés', 'Pièces jointes', 'Devenue le document'],
    actions: [
      { nom: "Copier l'adresse" },
      { nom: 'Ouvrir la pièce' },
      { nom: 'Documents reçus', lien: '/filed' },
      { nom: 'Comptabilité', lien: '/filed/comptabilite' },
    ],
  },
  {
    cle: 'fournisseurs', chemin: '/filed/fournisseurs', titre: 'Fournisseurs',
    textes: ['À confirmer', 'Bloqués', 'Actifs', 'IBAN', 'Factures'],
    actions: [
      { nom: 'Confirmer ce fournisseur', dialogue: 'Confirmer le fournisseur' },
      { nom: 'Proposer un IBAN', dialogue: 'Proposer un IBAN' },
      { nom: 'Documents reçus', lien: '/filed' },
    ],
  },
  {
    cle: 'a-payer', chemin: '/filed/a-payer', titre: 'À payer',
    textes: ['En retard', 'Cette semaine', 'Payée en partie', 'IBAN manquant', 'Reste à payer'],
    actions: [
      { nom: 'Noter un paiement', dialogue: 'Noter un paiement' },
      { nom: 'Fournisseurs', lien: '/filed/fournisseurs' },
    ],
  },
  {
    cle: 'varelo', chemin: '/varelo', titre: 'Référentiel du groupe',
    textes: ['Fournisseurs du groupe', 'Les codes de chaque société', 'Lots à valider', 'Sociétés et pôles'],
    actions: [
      { nom: 'Déposer un export', dialogue: "Déposer l'export d'une société" },
      { nom: 'Lancer un passage', dialogue: 'Lancer un passage de rapprochement' },
      { nom: 'Proposer un nom', dialogue: 'Proposer un nom pour le groupe' },
      { nom: 'Inscrire une société', dialogue: 'Inscrire une société au groupe' },
      { nom: 'Créer un pôle', dialogue: 'Créer un pôle' },
      { nom: 'Exporter (CSV)' },
    ],
  },
  {
    cle: 'tavaro', chemin: '/tavaro', titre: 'Location : retours et factures',
    textes: ['Tous les contrats', 'Le chiffrage du retour', 'Fil du dossier', 'Barème de remise en état'],
    actions: [
      { nom: 'Compléter les conditions', dialogue: 'Compléter les conditions du contrat' },
      { nom: 'Prolonger ou offrir le retard', dialogue: 'Amender le contrat' },
      { nom: 'Chiffrer le retour', dialogue: 'Chiffrer le retour du contrat' },
    ],
  },
  {
    cle: 'tiroma', chemin: '/tiroma', titre: 'Cabinet dentaire',
    textes: ['Créneaux à sauver', 'Plans sans rendez-vous', 'Avant les rendez-vous', "Liste d'attente", 'Fauteuils'],
    actions: [
      { nom: 'Noter la mutuelle', dialogue: 'La mutuelle' },
      { nom: 'Inscrire un patient', dialogue: "Inscrire un patient en liste d'attente" },
      { nom: 'Ajouter un praticien', dialogue: 'Ajouter un praticien' },
      { nom: 'Ajouter un fauteuil', dialogue: 'Ajouter un fauteuil' },
      { nom: 'Ajouter une fermeture', dialogue: 'Ajouter une fermeture' },
    ],
  },
  {
    cle: 'tamila', chemin: '/tamila', titre: 'Dossiers du cabinet',
    textes: ['Tous les dossiers', 'Parties', 'Audiences', 'Pièces', 'Journal des accès'],
    actions: [
      { nom: 'Nouveau dossier', dialogue: 'Ouvrir un dossier' },
      { nom: 'Coffre à clés', dialogue: 'Le coffre à clés du cabinet' },
      { nom: 'Exporter le dossier', dialogue: 'Exporter le dossier' },
      { nom: 'Saisir un avis', dialogue: 'Saisir un avis RPVA' },
      { nom: 'Clôturer le dossier', dialogue: 'Demander la clôture' },
    ],
  },
  {
    cle: 'lorani', chemin: '/lorani', titre: 'Calendrier des permis',
    textes: ['Tous les permis', 'Lu sur les courriers de la mairie', 'Calendrier', 'Échéances et rappels'],
    actions: [
      { nom: 'Nouveau projet', dialogue: 'Nouveau projet' },
      { nom: 'Nouveau permis', dialogue: 'Nouveau permis' },
      { nom: 'Déposer un courrier de la mairie', dialogue: 'Déposer un courrier de la mairie' },
      { nom: 'Arrêté reçu', dialogue: 'Décision de la mairie reçue' },
    ],
  },
  {
    cle: 'daliro', chemin: '/daliro', titre: 'Chantiers',
    textes: ['Tous les chantiers', 'Avenants à signer', 'Passages à confirmer'],
    actions: [
      { nom: 'Nouveau chantier', dialogue: 'Nouveau chantier' },
      { nom: 'Rattacher une facture', dialogue: 'Rattacher une facture au chantier' },
      { nom: 'Ajouter une ligne', dialogue: 'Ajouter une ligne au marché' },
      { nom: 'Révoquer', dialogue: "Révoquer l'accord permanent" },
    ],
  },
  {
    cle: 'point', chemin: '/point', titre: 'Point du matin',
    textes: ['Trésorerie', 'Factures reçues', 'Validations'],
    actions: [
      { nom: 'Jour précédent' },
      /* « Jour suivant » est gris sur le point du jour (pas de lendemain) : il ne compte pas */
      { nom: 'Ouvrir', lien: '/validations' },
    ],
  },
];

/* ——— dans la page : le nom accessible, la recherche d'une commande ——— */
const OUTILS = `
  window.__nr = {
    nom(e) {
      const par = e.getAttribute('aria-labelledby');
      const lie = par ? par.split(/\\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ') : '';
      return (e.getAttribute('aria-label') || lie || e.innerText || e.getAttribute('title') || e.value || '').replace(/\\s+/g, ' ').trim();
    },
    commandes() {
      return [...document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="link"], [role="menuitem"]')]
        .filter(e => !e.closest('[role="dialog"]'));
    },
    trouver(nom) {
      const n = nom.toLowerCase();
      const toutes = this.commandes().filter(e => this.nom(e).toLowerCase().startsWith(n));
      /* d'abord une commande visible et active */
      return toutes.find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled && e.getAttribute('aria-disabled') !== 'true'; }) ?? toutes[0] ?? null;
    },
  };
  true`;

let manques = 0;
const bilan = [];

async function ouvrir(largeur, chemin) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `a3-nr-${largeur}`, densite: 1 });
  const url = base + prefixe + chemin;
  const charge = await s.aller(url, { signe: `document.readyState === 'complete' && !!document.querySelector('h1')` });
  await s.dormir(1200);
  await s.evaluer(OUTILS);
  return { s, charge };
}

/* la page parcourue à la touche Tab : les noms des commandes atteintes */
async function parcoursClavier(s) {
  await s.evaluer(`document.activeElement?.blur(); window.scrollTo(0, 0); true`);
  const vus = new Set();
  let premier = null;
  for (let i = 0; i < 450; i++) {
    await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await s.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const n = await s.evaluer(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; e.dataset.nrVu = '1'; return window.__nr.nom(e); })()`);
    if (n === null) continue;
    if (premier === null) premier = n;
    else if (n === premier && vus.size > 3) break;
    vus.add(n.toLowerCase());
  }
  return vus;
}

for (const ecran of ECRANS) {
  if (filtre && !filtre.has(ecran.cle)) continue;
  const lignes = [];
  const note = (ok, quoi) => { lignes.push({ ok, quoi }); console.log(`${ok ? '  ✓' : '  ✗'} ${quoi}`); if (!ok) manques++; };
  console.log(`— ${prefixe}${ecran.chemin}`);

  let { s, charge } = await ouvrir(1440, ecran.chemin);
  note(charge, 'la page se charge');
  if (!charge) { s.fermer(); bilan.push({ cle: ecran.cle, lignes }); continue; }
  const h1 = await s.evaluer(`[...document.querySelectorAll('h1')].map(h => h.textContent.trim())`);
  note(h1.some((t) => t.toLowerCase().startsWith(ecran.titre.toLowerCase())), `titre « ${ecran.titre} » (h1 : ${h1.join(' | ') || 'aucun'})`);
  const texte = (await s.evaluer(`(document.querySelector('main') ?? document.body).innerText`)).toLowerCase();
  for (const t of ecran.textes) note(texte.includes(t.toLowerCase()), `texte « ${t} »`);

  const atteints = await parcoursClavier(s);
  const atteint = (nom) => [...atteints].some((n) => n.startsWith(nom.toLowerCase()));

  /* les actions sans navigation d'abord, sur la même page ; les liens ensuite, chacun sur une page neuve */
  for (const a of [...ecran.actions.filter((x) => !x.lien), ...ecran.actions.filter((x) => x.lien)]) {
    if (a.lien) { s.fermer(); ({ s } = await ouvrir(1440, ecran.chemin)); }
    const etat = await s.evaluer(`(() => { const e = window.__nr.trouver(${JSON.stringify(a.nom)}); if (!e) return null; const r = e.getBoundingClientRect(); return { visible: r.width > 0 && r.height > 0, actif: !e.disabled && e.getAttribute('aria-disabled') !== 'true' }; })()`);
    if (!etat) { note(false, `« ${a.nom} » : commande introuvable`); continue; }
    note(etat.visible && etat.actif, `« ${a.nom} » : présente${etat.visible ? '' : ', MAIS invisible'}${etat.actif ? '' : ', MAIS inactive'}`);
    note(atteint(a.nom), `« ${a.nom} » : atteignable au clavier (Tab)`);
    if (a.dialogue) {
      const r = await s.evaluer(`(async () => {
        const e = window.__nr.trouver(${JSON.stringify(a.nom)});
        e.focus(); e.click();
        for (let i = 0; i < 20 && !document.querySelector('[role="dialog"]'); i++) await new Promise(r => setTimeout(r, 100));
        const d = document.querySelector('[role="dialog"]');
        if (!d) return { ouvert: false };
        await new Promise(r => setTimeout(r, 250));
        const par = d.getAttribute('aria-labelledby');
        const titre = ((par && document.getElementById(par)?.textContent) || d.getAttribute('aria-label') || d.querySelector('h1, h2, h3')?.textContent || '').trim();
        return { ouvert: true, titre, focusDedans: d.contains(document.activeElement) };
      })()`);
      if (!r.ouvert) { note(false, `« ${a.nom} » : aucun dialogue ne s'ouvre`); continue; }
      note(r.titre.toLowerCase().startsWith(a.dialogue.toLowerCase()), `« ${a.nom} » : dialogue « ${r.titre} »`);
      note(r.focusDedans, `« ${a.nom} » : le focus entre dans le dialogue`);
      await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await s.dormir(450);
      const apres = await s.evaluer(`({ ferme: !document.querySelector('[role="dialog"]'), retour: (document.activeElement && document.activeElement !== document.body) ? window.__nr.nom(document.activeElement) : null })`);
      note(apres.ferme, `« ${a.nom} » : Échap ferme le dialogue`);
      note(!!apres.retour && apres.retour.toLowerCase().startsWith(a.nom.toLowerCase()), `« ${a.nom} » : le focus revient à la commande (${apres.retour ?? 'nulle part'})`);
    } else if (a.lien) {
      await s.evaluer(`(() => { const e = window.__nr.trouver(${JSON.stringify(a.nom)}); e.focus(); e.click(); })()`);
      let chemin = '';
      for (let i = 0; i < 30; i++) { await s.dormir(300); chemin = await s.evaluer(`location.pathname`); if (chemin !== (prefixe + ecran.chemin).split('?')[0]) break; }
      note(chemin === prefixe + a.lien, `« ${a.nom} » : mène à ${prefixe}${a.lien} (arrivé sur ${chemin})`);
    }
  }

  /* axe à 1440 */
  s.fermer();
  ({ s } = await ouvrir(1440, ecran.chemin));
  const axeEcarts = async (ss) => {
    await ss.evaluer(axe + ';true');
    return ss.evaluer(`(async () => { try { return (await axe.run(document.querySelector('main') ?? document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' ×' + v.nodes.length); } catch (e) { return ['axe en échec : ' + (e && e.message || e)]; } })()`);
  };
  const g1440 = await axeEcarts(s);
  note(g1440.length === 0, `axe 1440 : ${g1440.length ? g1440.join(', ') : 'aucun écart grave'}`);
  s.fermer();
  /* téléphone : axe et débordement */
  ({ s } = await ouvrir(390, ecran.chemin));
  const g390 = await axeEcarts(s);
  note(g390.length === 0, `axe 390 : ${g390.length ? g390.join(', ') : 'aucun écart grave'}`);
  const deb = await s.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  note(deb <= 0, `390 : pas de débordement horizontal (${deb})`);
  s.fermer();
  bilan.push({ cle: ecran.cle, lignes });
}

console.log(`\n══ Bilan ${prefixe} (${base}) ══`);
for (const b of bilan) {
  const ko = b.lignes.filter((l) => !l.ok);
  console.log(`${ko.length ? '✗' : '✓'} ${b.cle.padEnd(20)} ${b.lignes.length - ko.length}/${b.lignes.length}${ko.length ? '\n    manque : ' + ko.map((l) => l.quoi).join('\n    manque : ') : ''}`);
}
console.log(manques ? `\n${manques} manque(s)` : '\ntout est là');
process.exit(manques ? 1 : 0);
