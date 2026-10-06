/* fabriquer-courrier.mjs — fabriquer un courrier de mairie d'essai en PDF d'une page, texte natif
   (session B5, 06/10/2026). Sans dépendance : PDF 1.4 écrit à la main, Helvetica en WinAnsi (les accents
   passent), offsets de la table xref calculés. Sert à courrier-reel.mjs : chaque nature donne un fichier
   d'empreinte différente (la base refuse deux fois le même sha256 sur un même projet).

   usage : node omega/recette-b5/fabriquer-courrier.mjs <recepisse|demande_pieces|demande_pieces_2> <sortie.pdf> [mention]
   mention : une ligne de plus en pied de page (« Réf. 2 »…), pour redéposer le même courrier sous une autre empreinte. */
import { writeFileSync } from 'node:fs';

const MODELES = {
  recepisse: [
    [16, 'VILLE DE NANTES'],
    [11, 'Direction de l\'urbanisme - Service des autorisations du droit des sols'],
    [11, '2, rue de l\'Hôtel de Ville - 44094 Nantes Cedex 1'],
    [0, ''],
    [14, 'RÉCÉPISSÉ DE DÉPÔT D\'UNE DEMANDE DE PERMIS DE CONSTRUIRE'],
    [11, 'pour une maison individuelle et/ou ses annexes (Cerfa n° 13406)'],
    [0, ''],
    [12, 'Dossier n° PC 044109 26 A0042'],
    [12, 'Demandeur : M. et Mme Lemoine'],
    [12, 'Terrain : 14, chemin des Fourneaux, 44000 Nantes - parcelles AB 123, AB 124'],
    [12, 'Objet : construction d\'un pavillon de plain-pied'],
    [0, ''],
    [12, 'Dossier déposé le 15/09/2026 en mairie de Nantes.'],
    [0, ''],
    [11, 'Le délai d\'instruction de droit commun est de deux mois à compter de la date de dépôt.'],
    [11, 'Si vous ne recevez aucun courrier de l\'administration dans ce délai, vous bénéficierez'],
    [11, 'd\'un permis tacite (articles R*423-23 et R*424-1 du code de l\'urbanisme).'],
    [0, ''],
    [11, 'Cachet de la mairie : DÉPOSÉ LE 15 SEPT. 2026 - guichet unique, exemplaire du demandeur.'],
  ],
  demande_pieces: [
    [16, 'VILLE DE NANTES'],
    [11, 'Direction de l\'urbanisme - Service des autorisations du droit des sols'],
    [0, ''],
    [12, 'Nantes, le 01/10/2026'],
    [12, 'Lettre recommandée avec accusé de réception'],
    [0, ''],
    [14, 'Objet : demande de pièces complémentaires - dossier incomplet'],
    [12, 'Dossier n° PC 044109 26 A0042 - M. et Mme Lemoine'],
    [0, ''],
    [11, 'Madame, Monsieur,'],
    [11, 'Après examen, votre demande de permis de construire déposée le 15/09/2026 est incomplète.'],
    [11, 'Pour que son instruction puisse commencer, vous devez fournir les pièces suivantes :'],
    [11, '  - PCMI 3 : plan en coupe du terrain et de la construction ;'],
    [11, '  - PCMI 6 : document graphique d\'insertion du projet dans son environnement.'],
    [0, ''],
    [11, 'Vous disposez d\'un délai de trois mois à compter de la réception de ce courrier pour les'],
    [11, 'transmettre (article R*423-39 du code de l\'urbanisme). À défaut, votre demande fera'],
    [11, 'l\'objet d\'une décision tacite de rejet. Le délai d\'instruction partira de la réception'],
    [11, 'des pièces complètes en mairie.'],
    [0, ''],
    [11, 'Le service instructeur'],
  ],
};
/* une seconde demande, autre date et autres pièces : le socle écarte une proposition déjà saisie sur le permis
   (lorani_deja_saisi), une lettre identique ne proposerait plus rien */
MODELES.demande_pieces_2 = MODELES.demande_pieces.map(([c, t]) => [c, t
  .replace('Nantes, le 01/10/2026', 'Nantes, le 03/10/2026')
  .replace('PCMI 3 : plan en coupe du terrain et de la construction', 'PCMI 2 : plan de masse des constructions à édifier')
  .replace('PCMI 6 : document graphique', 'PCMI 8 : photographie situant le terrain dans le paysage proche, et document graphique')]);

const [nature, sortie, mention] = process.argv.slice(2);
if (!MODELES[nature] || !sortie) { console.error('usage : node fabriquer-courrier.mjs <recepisse|demande_pieces|demande_pieces_2> <sortie.pdf>'); process.exit(2); }

const echapper = (t) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
let y = 790;
const flux = ['BT'];
for (const [corps, texte] of [...MODELES[nature], ...(mention ? [[0, ''], [9, mention]] : [])]) {
  y -= corps ? Math.round(corps * 1.55) : 10;
  if (!corps) continue;
  flux.push(`/F1 ${corps} Tf 1 0 0 1 56 ${y} Tm (${echapper(texte)}) Tj`);
}
flux.push('ET');
const contenu = Buffer.from(flux.join('\n'), 'latin1');

const objets = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  null,
];
const morceaux = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
let taille = morceaux[0].length;
const offsets = [];
objets.forEach((o, i) => {
  offsets.push(taille);
  const b = o === null
    ? Buffer.concat([Buffer.from(`${i + 1} 0 obj\n<< /Length ${contenu.length} >>\nstream\n`, 'latin1'), contenu, Buffer.from('\nendstream\nendobj\n', 'latin1')])
    : Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
  morceaux.push(b);
  taille += b.length;
});
const xref = ['xref', `0 ${objets.length + 1}`, '0000000000 65535 f ', ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n `)].join('\n');
morceaux.push(Buffer.from(`${xref}\ntrailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${taille}\n%%EOF\n`, 'latin1'));
writeFileSync(sortie, Buffer.concat(morceaux));
console.log(`${sortie} : ${nature}, ${Buffer.concat(morceaux).length} octets`);
