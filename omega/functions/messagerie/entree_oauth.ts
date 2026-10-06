// Fonction Edge `messagerie-oauth` (verify_jwt false : le navigateur y revient de chez Google ou
// Microsoft). Coquille de déploiement : un index.ts qui importe ce fichier. Voir oauth.ts.
// URI de redirection à déclarer :
//   Google    : https://<projet>.supabase.co/functions/v1/messagerie-oauth/google/retour
//   Microsoft : https://<projet>.supabase.co/functions/v1/messagerie-oauth/microsoft/retour

import { configurationGoogleDepuisEnvironnement, gmail } from "./gmail.ts";
import {
  configurationMicrosoftDepuisEnvironnement,
  microsoft,
} from "./microsoft.ts";
import { creerOAuth } from "./oauth.ts";
import { portesDepuisEnvironnement } from "./portes.ts";

const google = configurationGoogleDepuisEnvironnement();
const ms = configurationMicrosoftDepuisEnvironnement();
const servir = creerOAuth({
  portes: portesDepuisEnvironnement(),
  messageries: {
    ...(google ? { gmail: gmail(google) } : {}),
    ...(ms ? { microsoft: microsoft(ms) } : {}),
  },
  base: `${
    (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "")
  }/functions/v1/messagerie-oauth`,
  journal: {
    erreur: (m, d) =>
      console.error(`[messagerie-oauth] ${m}`, d ? JSON.stringify(d) : ""),
  },
});

Deno.serve(servir);
