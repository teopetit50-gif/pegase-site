/* recette-3pages.mjs — les effets que les captures ne montrent pas, sur les
   trois pages refaites le 15/09 : la lueur qui suit le pointeur (/commencer),
   le volet collant qui marque l'étape (/reserver-un-audit), la nappe chiffrée
   (/vos-donnees).  usage : node outils/recette-3pages.mjs [origine] */
import { ouvrirSession } from "./chrome.mjs";
const base = process.argv[2] ?? "http://localhost:3010";
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? "  ✓" : "  ✗"} ${m}`); if (!c) echecs++; };

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "cm" });
  console.log("— /commencer : la lueur suit le pointeur");
  ok(await s.aller(base + "/commencer"), "page chargée");
  const c = await s.evaluer(`(() => { const e = document.querySelector('.cpo-carte'); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.x + r.width * 0.3, y: r.y + r.height * 0.3, x2: r.x + r.width * 0.7, y2: r.y + r.height * 0.7 }; })()`);
  ok(!!c, "carte trouvée");
  if (c) {
    await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y, buttons: 0 });
    await s.dormir(400);
    const v1 = await s.evaluer(`(() => { const e = document.querySelector('.cpo-carte');
      const st = getComputedStyle(e); return { x: st.getPropertyValue('--cpo-x').trim(), y: st.getPropertyValue('--cpo-y').trim() }; })()`);
    await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x2, y: c.y2, buttons: 0 });
    await s.dormir(400);
    const v2 = await s.evaluer(`(() => { const e = document.querySelector('.cpo-carte');
      const st = getComputedStyle(e); return { x: st.getPropertyValue('--cpo-x').trim(), y: st.getPropertyValue('--cpo-y').trim() }; })()`);
    ok(v1.x !== v2.x && v1.y !== v2.y, `la lueur se déplace : ${JSON.stringify(v1)} → ${JSON.stringify(v2)}`);
  }
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "rua" });
  console.log("— /reserver-un-audit : le volet marque l'étape");
  ok(await s.aller(base + "/reserver-un-audit"), "page chargée");
  await s.evaluer(`document.querySelector('.dra')?.scrollIntoView({block:'start', behavior:'instant'})`);
  await s.dormir(1400);
  const lire = () => s.evaluer(`(() => { const r = document.querySelectorAll('.dra-rang');
    return { n: r.length, actifs: [...r].map(e => e.getAttribute('data-actif') ?? e.className.includes('actif') ? 1 : 0),
             mode: document.querySelector('.dra')?.getAttribute('data-mode'),
             marques: [...document.querySelectorAll('.dra-temps')].map(e => getComputedStyle(e.querySelector('.r-h4') || e).color) }; })()`);
  const a1 = await lire();
  ok(a1.mode === "defile", `mode « ${a1.mode} » : le JavaScript a pris la main (repos = tout marqué)`);
  await s.evaluer(`window.scrollBy(0, 900)`); await s.dormir(1500);
  const a2 = await lire();
  ok(JSON.stringify(a1.marques) !== JSON.stringify(a2.marques), `l'étape marquée change au défilement`);
  const colle = await s.evaluer(`(() => { const v = document.querySelector('.dra-volet');
    return v ? getComputedStyle(v).position : null; })()`);
  ok(colle === "sticky", `volet en position ${colle}`);
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "vd" });
  console.log("— /vos-donnees : la nappe chiffrée");
  ok(await s.aller(base + "/vos-donnees"), "page chargée");
  await s.evaluer(`document.querySelector('#garanties')?.scrollIntoView({block:'center', behavior:'instant'})`);
  await s.dormir(1400);
  const carte = await s.evaluer(`(() => { const e = [...document.querySelectorAll('.cg-carte')].find(c => /hiffrement/.test(c.textContent));
    if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
  ok(!!carte, "carte « Chiffrement » trouvée");
  if (carte) {
    await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: carte.x, y: carte.y, buttons: 0 });
    await s.dormir(600);
    const nappe = await s.evaluer(`(() => { const e = [...document.querySelectorAll('.cg-carte')].find(c => /hiffrement/.test(c.textContent));
      const n = e.querySelector('[class*="nappe"], [aria-hidden][class*="cg-"]');
      return n ? { signes: (n.textContent || '').length, visible: getComputedStyle(n).display !== 'none' } : null; })()`);
    ok(nappe && nappe.signes > 100, `nappe générée : ${JSON.stringify(nappe)}`);
  }
  const autres = await s.evaluer(`[...document.querySelectorAll('.cg-carte')].length`);
  ok(autres >= 6, `${autres} cartes de garantie`);
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : "\ntout passe");
process.exit(echecs ? 1 : 0);
