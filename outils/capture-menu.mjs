/* Captures du menu : la barre seule, puis chaque panneau ouvert, sur les deux
   mondes. Survol uniquement (cliquer refermerait — voir recette-menu.mjs). */
import { writeFileSync, mkdirSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3010";
const sortie = process.argv[3] ?? "captures/menu";
mkdirSync(sortie, { recursive: true });

const VUES = [
  ["sombre", "/", 1440, 520],
  ["clair", "/offres/relances-impayes", 1440, 520],
  ["telephone", "/", 390, 844],
];

for (const [nom, chemin, largeur, hauteur] of VUES) {
  const s = await ouvrirSession({ largeur, hauteur, marque: "cap", flags: ["--disable-webgl"] });
  await s.aller(base + chemin);

  /* même attente qu'à la recette : l'encre du header met plusieurs secondes
     à se stabiliser sous un navigateur piloté */
  let avant = null;
  for (let i = 0; i < 30; i++) {
    await s.dormir(500);
    const c = await s.evaluer("getComputedStyle(document.querySelector('header a span') || document.body).color");
    /* plancher à 4 s : sur l'accueil l'encre est noire dès la première
         image (noir sur noir), la boucle sortait donc AVANT l'hydratation et
         les survols suivants ne faisaient rien — trois captures identiques. */
      if (c && c === avant && i >= 7) break;
    avant = c;
  }

  const tirer = async (suffixe) => {
    const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${sortie}/${nom}-${suffixe}.png`, Buffer.from(result.data, "base64"));
  };

  if (largeur >= 1024) {
    await tirer("barre");
    const centres = await s.evaluer(`
      [...document.querySelectorAll('[data-slot="navigation-menu-trigger"]')]
        .map(e => { const r = e.getBoundingClientRect();
                    return { nom: e.textContent.trim(), x: r.x + r.width/2, y: r.y + r.height/2 }; })
    `);
    await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: 12, y: 400, pointerType: "mouse" });
    await s.dormir(200);
    for (const t of centres) {
      /* deux mouvements : le premier entre sur l'intitulé, le second force un
         pointermove une fois le panneau ouvert. Sans le second, la première
         capture d'une série attrapait la barre sans son panneau. */
      await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: t.x, y: t.y, pointerType: "mouse" });
      await s.dormir(600);
      await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: t.x + 2, y: t.y, pointerType: "mouse" });
      await s.dormir(900);
      await tirer(t.nom.toLowerCase().replace(/[^a-z]+/g, "-"));
    }
  } else {
    await tirer("barre");
    const b = await s.evaluer(
      '(() => { const e = document.querySelector(\'button[aria-controls="menu-principal"]\');' +
      ' const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()',
    );
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await s.envoyer("Input.dispatchMouseEvent", {
        type, x: b.x, y: b.y, button: "left",
        clickCount: type === "mouseMoved" ? 0 : 1,
        buttons: type === "mousePressed" ? 1 : 0, pointerType: "mouse",
      });
    await s.dormir(1600);
    await tirer("panneau");

    /* puis la même vue, « Nos offres » déplié : c'est l'état qu'il faut
       regarder pour juger la densité, pas seulement la pile repliée. */
    const r = await s.evaluer(
      '(() => { const e = [...document.querySelectorAll("#menu-principal button")]' +
      '.find((b) => b.textContent.trim() === "Nos offres");' +
      ' const c = e.getBoundingClientRect(); return { x: c.x + c.width/2, y: c.y + c.height/2 }; })()',
    );
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await s.envoyer("Input.dispatchMouseEvent", {
        type, x: r.x, y: r.y, button: "left",
        clickCount: type === "mouseMoved" ? 0 : 1,
        buttons: type === "mousePressed" ? 1 : 0, pointerType: "mouse",
      });
    await s.dormir(900);
    await tirer("panneau-deplie");
  }
  console.log(nom, "→", sortie);
  s.fermer();
  await new Promise((r) => setTimeout(r, 300));
}
process.exit(0);
