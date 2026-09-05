/* ══════════════════════════════════════════════════════════════════════
   Passerelle vers le cockpit (05/09/2026)

   Le cockpit (app.omegaai.fr, projet pegase-dashboard) n'ouvre l'espace
   d'un client que sur présentation d'un LIEN SIGNÉ — voir, côté cockpit,
   lib/espace/session.ts : `lien.<expiration>.<clientId>.<HMAC-SHA256>`,
   signature base64url, secret ESPACE_SESSION_SECRET.

   Jusqu'ici le bouton « Ouvrir mon cockpit » envoyait sur /espace nu : le
   client, sans lien, tombait sur « Ce lien n'est plus valable » à chaque
   fois. Ici, le site — qui SAIT qui est connecté et à quelle entreprise il
   est rattaché (table `comptes`) — fabrique ce lien lui-même, avec le même
   secret, et le cockpit l'accepte comme s'il venait de Teo.

   Le lien ne vit que quelques minutes : il n'est pas envoyé par mail, il
   est consommé dans la seconde par la redirection. Le format doit rester
   IDENTIQUE à celui du cockpit — toute évolution se fait des deux côtés.
   ══════════════════════════════════════════════════════════════════════ */

import { createHmac } from "node:crypto";

/** Durée de vie du lien de passage : le temps d'une redirection. */
const DUREE_PASSAGE_S = 5 * 60;

export function creerLienCockpit(clientId: string): string | null {
  const cle = process.env.ESPACE_SESSION_SECRET;
  if (!cle || !clientId) return null;
  const exp = String(Date.now() + DUREE_PASSAGE_S * 1000);
  const charge = `lien.${exp}.${clientId}`;
  const sig = createHmac("sha256", cle).update(charge).digest("base64url");
  return `${charge}.${sig}`;
}
