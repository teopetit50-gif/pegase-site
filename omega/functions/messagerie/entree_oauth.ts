// Fonction Edge `messagerie-oauth` (verify_jwt false : le navigateur y revient de chez Google).
// Coquille de déploiement : un index.ts qui importe ce fichier. Voir oauth.ts.
// URI de redirection à déclarer dans l'application Google :
//   https://<projet>.supabase.co/functions/v1/messagerie-oauth/google/retour

import { configurationGoogleDepuisEnvironnement, gmail } from "./gmail.ts";
import { creerOAuth } from "./oauth.ts";
import { portesDepuisEnvironnement } from "./portes.ts";

const google = configurationGoogleDepuisEnvironnement();
const servir = creerOAuth({
  portes: portesDepuisEnvironnement(),
  gmail: google ? gmail(google) : null,
  base: `${
    (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "")
  }/functions/v1/messagerie-oauth`,
  journal: {
    erreur: (m, d) =>
      console.error(`[messagerie-oauth] ${m}`, d ? JSON.stringify(d) : ""),
  },
});

Deno.serve(servir);
