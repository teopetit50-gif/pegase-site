/* Recette des quatre tuiles animées du catalogue de l'accueil (11/09/2026).

   Elles bouclent sur minuterie : une capture en fige une image et ne prouve
   rien — ni que ça bouge, ni que chaque tuile bouge. On échantillonne donc
   la signature de chaque visuel à quatre instants et on exige un CHANGEMENT
   dans les quatre.

   Deux pièges, tous deux déjà payés ailleurs dans ce dossier :
   • sans screencast le compositeur n'avance pas et tout reste à la valeur de
     montage (`ouvrirSession` le démarre par défaut — ne pas le couper) ;
   • l'échelle et les translations de `motion` peuvent atterrir dans
     `transform` OU dans les propriétés individuelles `scale` / `translate` :
     la sonde lit les deux, sinon elle conclut « rien ne bouge ».

   Et un troisième propre à cette page : les cartes sont sous `[data-reveal]`,
   donc à opacité 0 jusqu'à ce que GSAP les révèle. Il faut faire ENTRER la
   section dans la fenêtre avant de mesurer.

   usage : node outils/anim-catalogue.mjs [url] [largeur]
*/
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/";
const largeur = Number(process.argv[3] ?? 1440);

const s = await ouvrirSession({
  largeur, hauteur: 900, marque: "catalogue",
  densite: 1, flags: ["--disable-webgl"],
});

const SONDE = `(() => {
  const sec = document.querySelector('#catalogue');
  if (!sec) return { erreur: 'section #catalogue absente' };
  const grille = sec.querySelector('div.grid');
  if (!grille) return { erreur: 'grille absente' };
  const cartes = [...grille.children];
  return {
    enfants: cartes.length,
    opacites: cartes.map(c => getComputedStyle(c).opacity),
    filets: cartes.map(c => getComputedStyle(c).borderTopColor),
    tuiles: cartes.map((c) => {
      const visuel = c.querySelector('[aria-hidden="true"]');
      if (!visuel) return 'SANS VISUEL';
      return [...visuel.querySelectorAll('*')].map((e) => {
        const g = getComputedStyle(e);
        return [g.transform, g.scale, g.translate, g.backgroundColor,
                g.borderTopColor, g.width, g.opacity].join('|');
      }).join('//');
    }),
    hauteurs: cartes.map(c => Math.round(c.getBoundingClientRect().height)),
    debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

try {
  if (!(await s.aller(url))) {
    console.log("⚠ page jamais prête (serveur éteint, ou qui recompile)");
  } else {
    /* Laisser la page HYDRATER avant de mesurer. Sans cette attente, une
       page servie par `next dev` qui vient de recompiler rend son HTML bien
       avant que `motion` ne prenne la main : les huit relevés tombent alors
       sur le même état, et la sonde annonce quatre tuiles figées. C'est le
       faux négatif le plus coûteux du harnais — il se déplace d'une largeur
       à l'autre d'une passe sur l'autre, ce qui le fait passer pour un bug
       de la page. Relevé le 11/09. */
    await s.dormir(2500);

    const geo = await s.evaluer(`(() => {
      const r = document.querySelector('#catalogue').getBoundingClientRect();
      return { haut: r.top + window.scrollY, hauteur: r.height };
    })()`);
    /* pas de 240 px et 400 ms de pause : le ScrollTrigger de chaque carte
       est en `once`, et un défilement trop rapide sous rendu logiciel passe
       devant une carte sans que son entrée soit enregistrée. */
    for (let y = geo.haut - 500; y < geo.haut + geo.hauteur; y += 240) {
      await s.evaluer(`window.scrollTo(0, ${y})`);
      await s.dormir(400);
    }
    await s.evaluer(`window.scrollTo(0, ${Math.round(geo.haut - 60)})`);
    await s.dormir(1400);

    /* huit instants sur cinq secondes : la plus lente des quatre boucles
       tourne à 2,4 s, et un échantillonnage trop court peut tomber deux fois
       sur le même état. On relève aussi l'horloge de la page — si elle
       n'avance pas, c'est le navigateur qui est saturé, pas le composant. */
    const N = Number(process.argv[4] ?? 10);
    const PAS = 700;
    const vues = [];
    const horloges = [];
    for (let i = 0; i < N; i++) {
      vues.push(await s.evaluer(SONDE));
      horloges.push(await s.evaluer(`Math.round(performance.now())`));
      await s.dormir(PAS);
    }
    console.log("visibilité : " + (await s.evaluer(`document.visibilityState`)) +
                " — horloge page : " + (horloges.at(-1) - horloges[0]) + " ms sur " +
                (N * PAS) + " ms de sonde");

    const v0 = vues[0];
    if (v0.erreur) {
      console.log("✗ " + v0.erreur);
    } else {
      console.log(`largeur ${largeur} — ${v0.enfants} enfants directs dans la grille ` +
                  (v0.enfants === 4 ? "✓ (le liseré doré garde sa vague)"
                                    : "✗ ATTENDU 4 : le décalage nth-child casse"));
      console.log("opacités  : " + v0.opacites.join("  ") +
                  (v0.opacites.every((o) => Number(o) > 0.99) ? "  ✓ révélées" : "  ✗ reveal non tiré"));
      console.log("filets    : " + v0.filets.join("  "));
      console.log("hauteurs  : " + v0.hauteurs.join("  ") + " px" +
                  (new Set(v0.hauteurs).size === 1 ? "  ✓ régulières" : "  ← rangées inégales"));
      console.log("débord H  : " + v0.debord + " px" + (v0.debord === 0 ? "  ✓" : "  ✗"));

      const noms = ["Relances (échéancier)", "Reprise (repriorisation)",
                    "Accueil (qualification)", "Factures (classement)"];
      console.log(`\nmouvement, sur ${N} instants espacés de ${PAS} ms :`);
      for (let c = 0; c < v0.enfants; c++) {
        const sigs = vues.map((v) => v.tuiles[c]);
        const distinctes = new Set(sigs).size;
        console.log(`  ${(noms[c] ?? "tuile " + c).padEnd(26)} ${distinctes} état(s) distinct(s)  ` +
                    (distinctes >= 2 ? "✓ ça bouge" : "✗ FIGÉ"));
      }
    }
  }
  const soucis = s.soucis.filter((x) => !/favicon/.test(x));
  console.log("\nconsole : " + (soucis.length ? soucis.slice(0, 6).join("\n          ") : "aucune erreur ✓"));
} finally {
  await s.fermer();
}
