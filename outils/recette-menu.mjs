/* Recette du menu de navigation (11/09/2026).

   Ce que les captures ne montrent pas et qu'il faut donc mesurer :
   – à quelle largeur le bandeau prend la relève du burger, et qu'à aucune
     largeur les DEUX s'affichent, ou aucun des deux ;
   – la couleur RÉELLE de l'encre des intitulés dans les deux mondes : le
     header prélève le fond sous lui, et un menu blanc sur fond blanc est
     invisible sans qu'aucune erreur ne soit levée ;
   – la boîte de chaque panneau, qui n'existe qu'ouvert et qui peut sortir de
     la fenêtre à droite sur la dernière rubrique ;
   – que le panneau se referme à Échap et quand la souris quitte la barre.

   ─ Quatre pièges payés en écrivant ce script, aucun n'était le site ─

   1. CLIQUER FERME. Radix ouvre au SURVOL et BASCULE au clic : un script qui
      survole puis clique referme ce qu'il vient d'ouvrir, et conclut que le
      menu ne s'ouvre pas. On survole, point.
   2. `querySelector` REND LE PREMIER. Tous les panneaux portent le même
      `data-slot` : le sélecteur simple rendait toujours celui de « Nos
      offres », quelle que soit la rubrique survolée — on croyait à un menu
      bloqué sur sa première entrée. On lit donc chaque panneau DANS son
      item, avec le nom de sa rubrique en regard.
   3. UN SURVOL SUR UNE PAGE NON HYDRATÉE NE FAIT RIEN. `aller()` rend la
      main dès que le HTML est là ; React n'a pas encore pris les commandes.
      D'où l'attente explicite avant de toucher à la souris.
   4. L'HORLOGE D'ANIMATION EST GELÉE. `playState: running`,
      `currentTime: 0` pendant quatre secondes : un navigateur qui ne produit
      pas d'image ne fait avancer aucune animation. C'est ce qui a fait
      retirer l'animation d'opacité du panneau (voir menu-principal.css) —
      donc si une opacité revient un jour à 0 ici, c'est un vrai défaut.

   Et `--disable-webgl`, sans quoi le shader de l'accueil gèle la sonde CDP. */
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3010";
const LARGEURS = process.argv[3]
  ? [Number(process.argv[3])]
  : [390, 768, 1024, 1440, 1700];

/* L'accueil est SOMBRE en haut, les pages produit sont CLAIRES de bout en
   bout : il faut les deux pour prouver le caméléon. */
const PAGES = [
  ["accueil (monde sombre)", "/"],
  ["relances (monde clair)", "/offres/relances-impayes"],
];

const nb = (v) => (typeof v === "number" ? Math.round(v) : v);

const SONDE_BARRE = `(() => {
  const q = (s) => document.querySelector(s);
  const vu = (e) => {
    if (!e) return null;
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return { display: c.display, w: r.width, h: r.height, x: r.x, encre: c.color };
  };
  const bandeau = q('[data-slot="navigation-menu"]');
  return {
    bandeau: vu(bandeau),
    intitule: vu(q('[data-slot="navigation-menu-trigger"]')),
    burger: vu(q('button[aria-controls="menu-principal"]')),
    encreVar: bandeau ? getComputedStyle(bandeau).getPropertyValue('--omenu-encre').trim() : null,
    clair: bandeau ? bandeau.classList.contains('omenu--clair') : null,
    debord: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`;

/* Chaque panneau lu DANS son item — jamais par un querySelector global. */
const SONDE_PANNEAUX = `(() => {
  return [...document.querySelectorAll('[data-slot="navigation-menu-item"]')].map((it) => {
    const t = it.querySelector('[data-slot="navigation-menu-trigger"]');
    const c = it.querySelector('[data-slot="navigation-menu-content"]');
    if (!c) return null;
    const g = getComputedStyle(c), r = c.getBoundingClientRect();
    return {
      nom: (t || it).textContent.trim(),
      etat: c.dataset.state, opacite: g.opacity, fond: g.backgroundColor,
      w: r.width, h: r.height, g: r.x, d: r.right,
      liens: c.querySelectorAll('[data-slot="navigation-menu-link"]').length,
      sorti: r.right > window.innerWidth || r.x < 0,
    };
  }).filter(Boolean);
})()`;

for (const largeur of LARGEURS) {
  console.log(`\n═══════════ ${largeur} px ═══════════`);

  for (const [nom, chemin] of PAGES) {
    const s = await ouvrirSession({
      largeur,
      hauteur: 900,
      marque: "menu",
      flags: ["--disable-webgl"],
    });
    if (!(await s.aller(base + chemin))) {
      console.log(`${nom} : la page n'est jamais arrivée`);
      s.fermer();
      continue;
    }
    /* Attendre que l'ENCRE SE STABILISE, pas un délai au jugé. Le header
       prélève le fond sous lui puis transite vers sa nouvelle couleur ; sous
       charge, le navigateur piloté produit si peu d'images que ces 200 à
       300 ms s'étirent au-delà de QUATRE SECONDES. Mesuré le 11/09 : à
       3 500 ms le bandeau se lisait encore blanc sur une page claire, et on
       a cru à un menu invisible — alors que la marque « Omega.AI », posée
       là depuis juillet, ramait exactement pareil à côté. Deux lectures
       identiques valent mieux que n'importe quel nombre écrit en dur. */
    let avant = null;
    for (let i = 0; i < 30; i++) {
      await s.dormir(500);
      const c = await s.evaluer(
        'getComputedStyle(document.querySelector(\'header a span\') || document.body).color',
      );
      /* plancher à 4 s : sur l'accueil l'encre est noire dès la première
         image (noir sur noir), la boucle sortait donc AVANT l'hydratation et
         les survols suivants ne faisaient rien — trois captures identiques. */
      if (c && c === avant && i >= 7) break;
      avant = c;
    }

    const e = await s.evaluer(SONDE_BARRE);
    const b = e.bandeau;
    console.log(
      `${nom}\n` +
        `  bandeau  ${b ? `${b.display}  ${nb(b.w)}×${nb(b.h)}  x=${nb(b.x)}` : "absent"}` +
        `   burger ${e.burger ? e.burger.display : "absent"}\n` +
        `  monde    ${e.clair ? "clair" : "sombre"}  --omenu-encre=${e.encreVar}` +
        `   encre calculée ${e.intitule?.encre}\n` +
        `  débord horizontal ${e.debord}`,
    );

    if (b && b.display !== "none") {
      const centres = await s.evaluer(`
        [...document.querySelectorAll('[data-slot="navigation-menu-trigger"]')]
          .map(e => { const r = e.getBoundingClientRect();
                      return { nom: e.textContent.trim(), x: r.x + r.width/2, y: r.y + r.height/2 }; })
      `);
      /* poser la souris ailleurs d'abord : un pointerenter suppose qu'on
         vienne de quelque part */
      await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: 12, y: 500, pointerType: "mouse" });
      await s.dormir(200);

      for (const t of centres) {
        await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: t.x, y: t.y, pointerType: "mouse" });
        await s.dormir(700);
        const ouverts = (await s.evaluer(SONDE_PANNEAUX)).filter((p) => p.etat === "open");
        if (!ouverts.length) {
          console.log(`    « ${t.nom} » → AUCUN PANNEAU`);
          continue;
        }
        for (const p of ouverts)
          console.log(
            `    « ${p.nom} » → ${nb(p.w)}×${nb(p.h)}  [${nb(p.g)}→${nb(p.d)}]  ${p.liens} liens` +
              `  fond ${p.fond}  opacité ${p.opacite}` +
              (p.nom !== t.nom ? "  ⚠ CE N'EST PAS LA RUBRIQUE SURVOLÉE" : "") +
              (p.opacite !== "1" ? "  ⚠ PANNEAU NON OPAQUE" : "") +
              (p.sorti ? "  ⚠ SORT DE LA FENÊTRE" : ""),
          );
      }

      /* Les deux sorties : Échap, puis la souris qui quitte la barre. */
      for (const [quoi, geste] of [
        ["Échap", async () => {
          for (const type of ["rawKeyDown", "keyUp"])
            await s.envoyer("Input.dispatchKeyEvent", { type, key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        }],
        ["souris sortie", async () => {
          await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: largeur - 20, y: 600, pointerType: "mouse" });
        }],
      ]) {
        await geste();
        await s.dormir(600);
        const reste = (await s.evaluer(SONDE_PANNEAUX)).filter((p) => p.etat === "open");
        console.log(`    ${quoi} → ${reste.length ? "⚠ reste ouvert : " + reste.map((p) => p.nom).join(", ") : "tout refermé"}`);
      }
    }

    const bruit = s.soucis.filter((m) => !/favicon|ERR_ABORTED|webpack-hmr/.test(m));
    if (bruit.length) console.log("  console :", bruit.slice(0, 3).join(" | "));
    s.fermer();
    await new Promise((r) => setTimeout(r, 300));
  }
}
console.log("\nfini");
process.exit(0);
