/* ══════════════════════════════════════════════════════════════════════
   Recette des trois blocs de capacités, sur les quatre pages produit
   (14/09/2026)

   Ce qu'on mesure, aux cinq largeurs :
   · le débordement horizontal RÉEL, avec l'élément coupable nommé ;
   · le texte qui sort de sa carte — un chevauchement à l'intérieur d'une
     boîte ne produit aucun débordement de page, et aucune capture ne le
     montre ;
   · la présence des six familles, des six cartes et des douze cas ;
   · l'ouverture VRAIE d'un cas limite. Le contenu d'un accordéon Radix
     fermé est DÉMONTÉ : chercher le texte d'une réponse repliée rend
     `null`, ce n'est pas un trou dans la page. On lit donc la hauteur.

   Usage : node outils/recette-capacites.mjs [base] [dossier de captures]
   ══════════════════════════════════════════════════════════════════════ */

import { writeFileSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3200";
const dossier = process.argv[3] ?? "/tmp";

const PAGES = [
  ["FILED", "/offres/factures-fournisseurs"],
  ["CASHD", "/offres/relances-impayes"],
  ["RELOAD", "/offres/nouvelles-affaires"],
  ["FRONTD", "/offres/demandes-clients"],
];
const LARGEURS = [390, 640, 768, 1280, 1700];

const SONDE = `(() => {
  const de = document.documentElement;
  const debord = Math.max(0, de.scrollWidth - de.clientWidth);
  let coupable = "";
  if (debord > 0) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 1) {
        coupable = (el.className && el.className.toString().slice(0, 60)) || el.tagName;
        break;
      }
    }
  }
  const fam = [...document.querySelectorAll(".cap-famille")];
  const cartes = [...document.querySelectorAll(".cap-carte")];
  const cas = [...document.querySelectorAll(".cap-cas-item")];
  const b = document.querySelector(".cap-compte b");
  let hors = 0;
  for (const f of [...fam, ...cartes]) {
    const rf = f.getBoundingClientRect();
    for (const e of f.querySelectorAll("li, p, h3")) {
      const re = e.getBoundingClientRect();
      if (re.right > rf.right + 1 || re.bottom > rf.bottom + 1) hors++;
    }
  }
  return { debord, coupable, fam: fam.length, cartes: cartes.length,
           cas: cas.length, compte: b ? b.textContent : "", hors };
})()`;

const lignes = [];
const ennuis = [];
const dire = (bon, t) => {
  lignes.push(`${bon ? "✓" : "✗"} ${t}`);
  console.log(`${bon ? "✓" : "✗"} ${t}`);
  if (!bon) ennuis.push(t);
};

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 900, marque: `cap-${largeur}` });
  for (const [code, route] of PAGES) {
    const arrive = await s.aller(base + route, { signe: `!!document.querySelector(".cap-famille")` });
    if (!arrive) {
      dire(false, `${code} ${largeur}px — la page n'a pas rendu le bloc de capacités`);
      continue;
    }
    await s.dormir(400);
    const m = await s.evaluer(SONDE);
    const bon = m.debord === 0 && m.hors === 0 && m.fam === 6 && m.cartes === 6 && m.cas === 12;
    dire(
      bon,
      `${code.padEnd(7)} ${String(largeur).padStart(5)}px — débord ${m.debord}` +
        `, familles ${m.fam}, cartes ${m.cartes}, cas ${m.cas}` +
        `, ${m.compte} capacités, texte hors carte ${m.hors}` +
        (m.coupable ? ` ← ${m.coupable}` : ""),
    );
  }
  s.fermer();
}

/* L'accordéon : on clique, puis on lit la HAUTEUR du contenu. */
{
  const s = await ouvrirSession({ largeur: 1280, hauteur: 900, marque: "cap-accordeon" });
  await s.aller(base + "/offres/factures-fournisseurs", {
    signe: `!!document.querySelector(".cap-cas-tete")`,
  });
  /* Amener la section à l'écran AVANT de cliquer. Les sections des pages
     produit apparaissent au défilement (`Apparition`) : tant qu'elles ne
     sont pas entrées dans la fenêtre, la hauteur mesurée d'un panneau qui
     s'ouvre vaut zéro, et la sonde conclut à tort que l'accordéon est
     mort. Diagnostic posé le 14/09 : le même clic rend 0 px sans défilement
     et 60 px avec. */
  await s.evaluer(`document.querySelector("#cas-limites").scrollIntoView(), true`);
  await s.dormir(600);
  const avant = await s.evaluer(
    `(document.querySelector(".cap-cas-corps") || {}).clientHeight ?? -1`,
  );
  await s.evaluer(`document.querySelector(".cap-cas-tete").click(), true`);
  await s.dormir(1200);
  const apres = await s.evaluer(
    `(document.querySelector(".cap-cas-corps") || {}).clientHeight ?? -1`,
  );
  dire(apres > 20, `accordéon des cas limites — hauteur ${avant} → ${apres} px`);

  const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/capacites-1280.png`, Buffer.from(result.data, "base64"));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: "cap-mobile" });
  await s.aller(base + "/offres/factures-fournisseurs#perimetre", {
    signe: `!!document.querySelector(".cap-famille")`,
  });
  await s.dormir(900);
  const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/capacites-390.png`, Buffer.from(result.data, "base64"));
  s.fermer();
}

console.log(
  ennuis.length
    ? `\n✗ ${ennuis.length} mesure(s) à revoir`
    : `\n✓ ${lignes.length} mesures, rien à signaler`,
);
process.exit(ennuis.length ? 1 : 0);
