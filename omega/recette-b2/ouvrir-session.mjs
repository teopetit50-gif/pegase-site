/* ouvrir-session.mjs — obtient une session Supabase (mot de passe) pour la
   relecture en base réelle, et l'écrit dans un fichier JSON HORS du dépôt
   (session B2, 06/10/2026). Le fichier porte un jeton : il ne se commite
   jamais ; il vit dans le scratchpad de la session.
   usage : node omega/recette-b2/ouvrir-session.mjs <url supabase> <clé publique> <courriel> <mot de passe> <fichier de sortie> */
import { writeFileSync } from 'node:fs';

const [url, cle, email, mdp, sortie] = process.argv.slice(2);
if (!url || !cle || !email || !mdp || !sortie) {
  console.error('usage : node ouvrir-session.mjs <url> <clé> <courriel> <mot de passe> <fichier>');
  process.exit(2);
}
const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: cle },
  body: JSON.stringify({ email, password: mdp }),
});
const corps = await r.json();
if (!r.ok || !corps.access_token) {
  console.error('connexion refusée :', r.status, JSON.stringify(corps).slice(0, 300));
  process.exit(1);
}
writeFileSync(sortie, JSON.stringify(corps));
console.log(`session de ${corps.user?.email} écrite dans ${sortie} (expire dans ${corps.expires_in} s)`);
