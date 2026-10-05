// Fabrique une requête signée pour POST /reception/formulaire et imprime la commande curl.
//   FORMULAIRE_SECRET=… deno run signer_formulaire.ts '<corps JSON>' [URL]
// Signature : X-Omega-Horodatage = secondes Unix, X-Omega-Signature = hex
// HMAC-SHA256(FORMULAIRE_SECRET, "<horodatage>.<corps brut>"). Même algorithme que
// formulaire.ts ; le site Next.js signe de la même façon côté serveur.

import { hmacSha256Hex } from "../commun.ts";

const secret = Deno.env.get("FORMULAIRE_SECRET")?.trim();
if (!secret) {
  console.error("FORMULAIRE_SECRET manquant dans l'environnement");
  Deno.exit(1);
}
const corps = Deno.args[0];
if (!corps) {
  console.error(
    "usage : FORMULAIRE_SECRET=… deno run signer_formulaire.ts '<corps JSON>' [URL]",
  );
  Deno.exit(1);
}
try {
  JSON.parse(corps);
} catch {
  console.error("le corps n'est pas du JSON valide");
  Deno.exit(1);
}
const url = Deno.args[1] ??
  "https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reception/formulaire";
const horodatage = String(Math.floor(Date.now() / 1000));
const signature = await hmacSha256Hex(secret, `${horodatage}.${corps}`);
const corpsShell = corps.replace(/'/g, `'\\''`);

console.log(`X-Omega-Horodatage: ${horodatage}`);
console.log(`X-Omega-Signature: ${signature}`);
console.log("");
console.log(
  `curl -s -X POST '${url}' -H 'Content-Type: application/json' -H 'X-Omega-Horodatage: ${horodatage}' -H 'X-Omega-Signature: ${signature}' --data-raw '${corpsShell}'`,
);
console.log("");
console.log(
  "(valable 5 minutes : la fonction rejette un horodatage plus ancien)",
);
