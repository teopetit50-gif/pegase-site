/* recette-tarifs-site.mjs — ce qu'aucune capture de defile.mjs ne prouve sur
   /tarifs/site refaite (14/09/2026) :
   · les tuiles du mur s'inclinent VRAIMENT sous le pointeur (transform qui
     change, et qui revient à plat à la sortie) ;
   · le compteur du premier fait affiche bien la valeur finale (21) une fois
     la bande entrée dans la fenêtre — et la portait déjà dans le HTML servi ;
   · l'accordéon de la FAQ ouvre et referme pour de bon (hauteur mesurée), et
     une seule réponse est ouverte à la fois ;
   · aucune de ces interactions n'élargit la page à 390.
   usage : node outils/recette-tarifs-site.mjs [url] [dossier]

   Pièges déjà payés ailleurs, évités ici : on attend 1,5 s après un geste
   (Lenis lisse, les ressorts mettent ~1 s) ; on compte les éléments par leur
   BOÎTE (getClientRects) et non par leur opacité ; on vise les cibles par
   leur libellé, jamais par « le premier du DOM ». */
import { writeFileSync, mkdirSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/tarifs/site";
const dossier = process.argv[3] ?? "captures-tarifs-site";
mkdirSync(dossier, { recursive: true });

let echecs = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${msg}`);
  if (!cond) echecs++;
};
const capture = async (s, nom) => {
  const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/${nom}.png`, Buffer.from(result.data, "base64"));
};
const clic = async (s, x, y) => {
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
/* centre de l'élément visible qui porte ce libellé — jamais « le premier » */
const viser = (s, sel, texte) =>
  s.evaluer(`
  (() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})]
             .filter(e => e.getClientRects().length > 0)
             .find(e => ${texte ? `e.textContent.includes(${JSON.stringify(texte)})` : "true"});
           if (!el) return null; const r = el.getBoundingClientRect();
           return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 180),
                    w: Math.round(r.width), h: Math.round(r.height) }; })()`);

/* ═══════════ 1440 ═══════════ */
{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "tsite" });
  console.log("— 1440 × 900");
  ok(await s.aller(url), "page chargée");

  /* ——— le mur : l'inclinaison au pointeur ——— */
  const tuile = await viser(s, ".mm-tuile");
  ok(!!tuile, `une tuile du mur trouvée (${tuile && tuile.w}×${tuile && tuile.h})`);
  const lireCarte = () =>
    s.evaluer(`(() => { const c = document.querySelector('.mm-carte');
       if (!c) return null; const st = getComputedStyle(c);
       return { transform: st.transform, suivi: c.hasAttribute('data-suivi') }; })()`);
  const repos = await lireCarte();
  if (tuile) {
    /* deux mouvements : entrer au centre, puis descendre vers le bas droit —
       un seul pointermove ne déclenche pas toujours le suivi */
    await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: tuile.x, y: tuile.y, buttons: 0 });
    await s.dormir(300);
    await s.envoyer("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: tuile.x + tuile.w * 0.3,
      y: tuile.y + tuile.h * 0.25,
      buttons: 0,
    });
    await s.dormir(600);
  }
  const survol = await lireCarte();
  ok(survol && survol.suivi, `la carte est en suivi pendant le survol (${survol && survol.suivi})`);
  ok(
    repos && survol && repos.transform !== survol.transform,
    `le transform change au survol (${repos && repos.transform} → ${survol && survol.transform})`
  );
  await capture(s, "1440-mur-incline");
  /* sortie : retour à plat */
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10, buttons: 0 });
  await s.dormir(700);
  const apres = await lireCarte();
  ok(apres && !apres.suivi, "le suivi est retiré à la sortie du pointeur");

  /* ——— les faits : la valeur finale est dans le HTML, et reste après compte ——— */
  const htmlServi = await fetch(url).then((r) => r.text());
  ok(/21/.test(htmlServi) && /fs-valeur/.test(htmlServi), "la bande des faits est rendue côté serveur");
  await s.evaluer("document.querySelector('.fs-liste')?.scrollIntoView({block:'center', behavior:'instant'})");
  await s.dormir(1800);
  const fait = await s.evaluer(`(() => { const l = document.querySelector('.fs-liste');
     if (!l) return null; const c = l.querySelector('.fs-compteur');
     return { cellules: l.querySelectorAll('.fs-fait').length,
              compteur: c ? c.textContent.trim() : null,
              premier: l.querySelector('.fs-fait')?.textContent.trim().slice(0, 40) }; })()`);
  ok(fait && fait.cellules === 4, `quatre faits (${fait && fait.cellules})`);
  ok(fait && /21/.test(fait.compteur || ""), `le compteur affiche sa valeur finale (${fait && fait.compteur})`);
  await capture(s, "1440-faits");

  /* ——— la FAQ : ouverture réelle, une seule à la fois ——— */
  await s.evaluer("document.querySelector('#faq')?.scrollIntoView({block:'start', behavior:'instant'})");
  await s.dormir(1200);
  const etatFaq = () =>
    s.evaluer(`(() => { const its = [...document.querySelectorAll('[data-state]')]
       .filter(e => e.closest('#faq') && e.getAttribute('role') !== 'region' && e.tagName === 'BUTTON');
       const ouverts = [...document.querySelectorAll('#faq [data-state="open"]')];
       /* 14/09 : un sélecteur de région sans état rend la PREMIERE region du
          DOM, qui est celle qu on vient de fermer (hauteur 0) — la sonde
          annoncait alors une reponse non depliee alors que la suivante
          l etait. On vise la region dont l etat est open. (Pas d accent grave
          ici : ce code vit dans un gabarit de chaine, un seul le refermerait.) */
       const contenu = document.querySelector('#faq [role="region"][data-state="open"]')
                    || document.querySelector('#faq [role="region"]');
       return { boutons: its.length,
                ouverts: its.filter(b => b.getAttribute('data-state') === 'open').length,
                hauteurContenu: contenu ? Math.round(contenu.getBoundingClientRect().height) : 0,
                marqueurs: ouverts.length }; })()`);
  const faq0 = await etatFaq();
  ok(faq0 && faq0.boutons === 5, `cinq questions (${faq0 && faq0.boutons})`);
  ok(faq0 && faq0.ouverts === 1, `une seule réponse ouverte au chargement (${faq0 && faq0.ouverts})`);
  ok(faq0 && faq0.hauteurContenu > 20, `la réponse ouverte a une hauteur (${faq0 && faq0.hauteurContenu} px)`);

  /* on clique la DEUXIÈME question : la première doit se refermer */
  const q2 = await s.evaluer(`(() => { const bs = [...document.querySelectorAll('#faq button')]
     .filter(b => b.getClientRects().length > 0);
     const b = bs[1]; if (!b) return null; const r = b.getBoundingClientRect();
     return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: b.textContent.trim().slice(0, 50) }; })()`);
  ok(!!q2, `deuxième question visée (${q2 && q2.t})`);
  if (q2) {
    await clic(s, q2.x, q2.y);
    await s.dormir(900);
  }
  const faq1 = await etatFaq();
  ok(faq1 && faq1.ouverts === 1, `toujours une seule ouverte après clic (${faq1 && faq1.ouverts})`);
  ok(faq1 && faq1.hauteurContenu > 20, `la nouvelle réponse est dépliée (${faq1 && faq1.hauteurContenu} px)`);
  await capture(s, "1440-faq-ouverte");

  /* ——— le journal : les quatre lignes entrent l'une après l'autre ——— */
  await s.evaluer("document.querySelector('.jd')?.scrollIntoView({block:'center', behavior:'instant'})");
  await s.dormir(400);
  const jd0 = await s.evaluer(`(() => { const r = document.querySelector('.jd');
     const l = [...document.querySelectorAll('.jd-ligne')];
     return { depart: r?.getAttribute('data-rejoue'),
              opacites: l.map(e => Number(getComputedStyle(e).opacity).toFixed(2)) }; })()`);
  await s.dormir(2600);
  const jd1 = await s.evaluer(`(() => {
     const l = [...document.querySelectorAll('.jd-ligne')];
     return { opacites: l.map(e => Number(getComputedStyle(e).opacity).toFixed(2)) }; })()`);
  ok(jd0 && jd0.depart === "oui", `le journal a reçu le départ (${jd0 && jd0.depart})`);
  ok(
    jd1 && jd1.opacites.length === 4 && jd1.opacites.every((o) => Number(o) === 1),
    `les quatre lignes sont posées au bout de 3 s (${jd1 && jd1.opacites.join(" ")}) — au départ ${jd0 && jd0.opacites.join(" ")}`
  );
  await capture(s, "1440-journal");

  /* ——— la bande nuit : le faisceau existe et tourne ——— */
  await s.evaluer("document.querySelector('.cn-faisceau')?.scrollIntoView({block:'center', behavior:'instant'})");
  await s.dormir(500);
  const faisceau = await s.evaluer(`(() => { const f = document.querySelector('.cn-faisceau-point') || document.querySelector('.cn-faisceau');
     if (!f) return null; const st = getComputedStyle(f);
     return { affiche: st.display !== 'none' && st.visibility !== 'hidden',
              chemin: st.offsetPath || st.getPropertyValue('offset-path'),
              anim: st.animationName, duree: st.animationDuration,
              distance: st.offsetDistance || st.getPropertyValue('offset-distance') }; })()`);
  ok(faisceau && faisceau.affiche, `le faisceau est affiché (${faisceau && faisceau.affiche})`);
  ok(
    /* 14/09 : le navigateur normalise rect(0 auto auto 0 round 19px) en
       inset(0px 0% 0% 0px round 19px) — attendre « rect » fait échouer une
       page qui va bien. */
    faisceau && /rect|inset|path/.test(faisceau.chemin || "") && faisceau.anim !== "none",
    `il suit un chemin animé (chemin ${faisceau && faisceau.chemin}, ${faisceau && faisceau.anim} ${faisceau && faisceau.duree})`
  );
  const d1 = faisceau && faisceau.distance;
  await s.dormir(1200);
  const d2 = await s.evaluer("getComputedStyle(document.querySelector('.cn-faisceau-point') || document.querySelector('.cn-faisceau')).offsetDistance");
  ok(d1 !== d2, `le faisceau avance (${d1} → ${d2})`);
  await capture(s, "1440-bande-nuit");

  const deb = await s.evaluer("document.documentElement.scrollWidth - window.innerWidth");
  ok(deb === 0, `débordement horizontal ${deb}`);
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

/* ═══════════ 390 ═══════════ */
{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: "tsite390" });
  console.log("— 390 × 844");
  ok(await s.aller(url), "page chargée");

  const mur = await s.evaluer(`(() => { const t = [...document.querySelectorAll('.mm-tuile')];
     if (!t.length) return null; const r = t[0].getBoundingClientRect();
     return { n: t.length, w: Math.round(r.width), page: document.documentElement.scrollWidth,
              style: getComputedStyle(t[0].querySelector('.mm-style')).display }; })()`);
  ok(mur && mur.n === 4, `quatre tuiles (${mur && mur.n})`);
  ok(mur && mur.page === 390, `page à ${mur && mur.page} px de large`);
  ok(mur && mur.style === "none", `le parti pris est masqué sous 640 (${mur && mur.style})`);

  const faits = await s.evaluer(`(() => { const l = document.querySelector('.fs-liste');
     if (!l) return null; const st = getComputedStyle(l);
     const c = [...l.querySelectorAll('.fs-fait')].map(f => Math.round(f.getBoundingClientRect().width));
     return { cols: st.gridTemplateColumns, largeurs: c }; })()`);
  ok(
    faits && faits.largeurs.length === 4 && faits.largeurs[0] === faits.largeurs[1],
    `les faits sont en 2 × 2 (${faits && JSON.stringify(faits.largeurs)})`
  );
  await capture(s, "390-faits");

  await s.evaluer("document.querySelector('#faq')?.scrollIntoView({block:'start', behavior:'instant'})");
  await s.dormir(1200);
  await capture(s, "390-faq");
  const deb = await s.evaluer("document.documentElement.scrollWidth - window.innerWidth");
  ok(deb === 0, `débordement horizontal ${deb}`);
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : "\ntout passe");
process.exit(echecs ? 1 : 0);
