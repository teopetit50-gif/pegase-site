/* Recette des trois sections reprises de 21st.dev sur /tarifs (14/09/2026).

   Ce qu'aucune capture de défilé ne prouve :
   1. l'accordéon Radix de la FAQ S'OUVRE VRAIMENT (hauteur > 0 après
      l'animation) et se referme quand on ouvre une autre question ;
   2. à 390, le bouton WhatsApp de la carte sombre tient sur UNE ligne.

   ⚠ Le volet navigateur de l'app, replié, gèle le rendu : l'accordéon y
   passe à `data-state="open"` avec une hauteur de 0 pour toujours — ce
   n'est pas un bug du site, c'est [[transitions-gelees-sans-trames]]. La
   sonde tourne donc dans son propre Chromium, screencast allumé.

   usage : node outils/recette-faq-tarifs.mjs [url de base]
*/
import { writeFileSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3200";
const dossier = process.argv[3] ?? "/tmp";
let ok = true;
const dire = (bon, texte) => {
  ok &&= bon;
  console.log(`${bon ? "✓" : "✗"} ${texte}`);
};

/* ——— 1. l'accordéon, à 1440 ——— */
{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "faq-tarifs" });
  await s.aller(`${base}/tarifs#faq`);
  /* attendre l'hydratation : les boutons Radix n'existent qu'une fois le
     composant client monté — juste après un redémarrage du serveur, la
     première réponse peut mettre plusieurs secondes */
  for (let i = 0; i < 40; i++) {
    if (await s.evaluer(`document.querySelectorAll('#faq button[aria-controls]').length`)) break;
    await s.dormir(250);
  }
  await s.dormir(1600);
  await s.evaluer(`document.getElementById('faq').scrollIntoView({block:'start'})`);
  await s.dormir(1200);

  const clic = (texte) =>
    s.evaluer(`(() => {
      const b = [...document.querySelectorAll('#faq button')].find(x => x.textContent.includes(${JSON.stringify(texte)}));
      b.click(); return !!b;
    })()`);
  const lire = (texte) =>
    s.evaluer(`(() => {
      const b = [...document.querySelectorAll('#faq button')].find(x => x.textContent.includes(${JSON.stringify(texte)}));
      const c = document.getElementById(b.getAttribute('aria-controls'));
      return { etat: b.getAttribute('data-state'), hauteur: c ? c.getBoundingClientRect().height : -1 };
    })()`);

  await clic("Comment se passe le paiement");
  await s.dormir(700);
  const a = await lire("Comment se passe le paiement");
  dire(a.etat === "open" && a.hauteur > 80, `« Comment se passe le paiement ? » ouverte : ${a.etat}, ${Math.round(a.hauteur)} px`);

  await clic("Puis-je changer de palier");
  await s.dormir(700);
  const b = await lire("Comment se passe le paiement");
  const c = await lire("Puis-je changer de palier");
  /* -1 = le contenu est DÉMONTÉ : Radix (Presence) retire le nœud une fois
     l'animation de fermeture finie. C'est la fermeture réussie, pas un trou. */
  dire(b.etat === "closed" && b.hauteur <= 0, `la première se referme : ${b.etat}, ${b.hauteur < 0 ? "démontée" : Math.round(b.hauteur) + " px"}`);
  dire(c.etat === "open" && c.hauteur > 40, `la seconde s'ouvre : ${c.etat}, ${Math.round(c.hauteur)} px`);

  const cliche = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/faq-1440-ouverte.png`, Buffer.from(cliche.result.data, "base64"));
  await s.fermer();
}

/* ——— 2. la carte sombre, à 390 ——— */
{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: "cta-tarifs" });
  await s.aller(`${base}/tarifs#reserver`);
  await s.dormir(1600);
  await s.evaluer(`document.getElementById('reserver').scrollIntoView({block:'start'})`);
  await s.dormir(1200);
  const m = await s.evaluer(`(() => {
    const boutons = [...document.querySelectorAll('#reserver a.r-btn')].map(a => ({
      /* innerText, pas textContent : le numéro est en hidden sm:inline,
         et textContent le lirait quand même */
      texte: a.innerText.trim().replace(/\\s+/g, ' '),
      hauteur: Math.round(a.getBoundingClientRect().height),
      largeur: Math.round(a.getBoundingClientRect().width),
    }));
    return { boutons, debord: document.documentElement.scrollWidth - innerWidth };
  })()`);
  for (const b of m.boutons) dire(b.hauteur <= 48, `bouton « ${b.texte} » : ${b.hauteur} px de haut, ${b.largeur} px de large`);
  dire(m.debord === 0, `débordement horizontal à 390 : ${m.debord}`);
  const cliche = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/cta-390.png`, Buffer.from(cliche.result.data, "base64"));
  await s.fermer();
}

console.log(ok ? "\nrecette passée" : "\nrecette EN ÉCHEC");
process.exit(ok ? 0 : 1);
