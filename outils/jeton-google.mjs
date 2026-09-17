#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   OBTENIR LE JETON GOOGLE — à lancer UNE FOIS, sur ce Mac

       node outils/jeton-google.mjs <CLIENT_ID> <CLIENT_SECRET>

   Le mail de confirmation pose un lien Google Meet (lib/visio.ts). Pour
   ouvrir une salle, il faut agir au nom d'un vrai compte Google — celui
   d'Omega —, autorisé une fois pour toutes. Ce script fait cette
   autorisation : il ouvre la page de consentement Google, récupère le
   code au retour, et imprime le jeton de rafraîchissement à coller dans
   Vercel (GOOGLE_OAUTH_REFRESH_TOKEN).

   AVANT DE LE LANCER, dans console.cloud.google.com, avec le compte
   Google d'Omega :
   1. un projet (n'importe lequel) ;
   2. « API et services » → activer l'API Google Calendar ;
   3. « Écran de consentement OAuth » → externe → et le PUBLIER
      (« En production »). Laissé en « Test », Google fait expirer le
      jeton au bout de SEPT JOURS et les liens s'arrêtent tout seuls un
      matin, sans que rien ne le dise ;
   4. « Identifiants » → créer un ID client OAuth → type « Application
      de bureau ». C'est l'identifiant et le secret à passer ici.

   L'écran d'avertissement « Google n'a pas validé cette application »
   est normal : l'application, c'est nous, pour notre propre agenda.
   Cliquer « Paramètres avancés » puis « Continuer ».
   ══════════════════════════════════════════════════════════════════════ */

import http from "node:http";
import { exec } from "node:child_process";

const [, , CLIENT_ID, CLIENT_SECRET] = process.argv;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Usage : node outils/jeton-google.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const autorisation =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    /* offline + consent : sans les deux, Google ne rend PAS de jeton de
       rafraîchissement à la deuxième autorisation du même compte. */
    access_type: "offline",
    prompt: "consent",
  });

const serveur = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Pas de code dans la réponse.");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<p style='font:16px system-ui'>C'est bon. Retournez au terminal.</p>");

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });
  const j = await r.json();
  serveur.close();

  if (!j.refresh_token) {
    console.error("\nPas de jeton de rafraîchissement rendu :", JSON.stringify(j, null, 2));
    console.error(
      "\nSouvent : le compte avait déjà autorisé cette application. Retirer l'accès sur",
      "\nhttps://myaccount.google.com/permissions puis relancer.",
    );
    process.exit(1);
  }

  console.log("\n── À poser sur le projet Vercel pegase-site2 ──\n");
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${j.refresh_token}`);
  console.log("\n(GOOGLE_CALENDAR_ID est facultatif : « primary » par défaut.)\n");
});

serveur.listen(PORT, "127.0.0.1", () => {
  console.log("\nOuverture de la page d'autorisation Google…");
  console.log("Si rien ne s'ouvre, coller cette adresse dans le navigateur :\n");
  console.log(autorisation + "\n");
  exec(`open "${autorisation}"`);
});
