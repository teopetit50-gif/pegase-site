// preuve_formulaire — Prouver le chemin utile de la coquille `reception` par le formulaire signé, session A2, 06/10/2026.
// À jouer pendant la répétition générale. Écrit UNE réception d'essai (canal formulaire, boîte site:omegaai.fr) ;
// rien n'est effacé. Le secret n'est jamais écrit : il est lu dans l'environnement, et jamais imprimé.
//
//   FORMULAIRE_SECRET=… deno run --allow-env --allow-net omega/functions/reception/outils/preuve_formulaire.ts [URL de la fonction]
//   (facultatif) SUPABASE_SERVICE_ROLE_KEY=… : le script relit lui-même la ligne dans public.receptions ;
//   sans elle, il imprime la requête SQL de contrôle à passer à la main.
//
// URL par défaut : la recette, https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reception/formulaire
// Quatre contrôles, code de sortie 1 au premier qui tombe :
//   1. signature fausse → 401, rien n'est écrit ;
//   2. requête signée → 201 {id, nouvelle: true} ;
//   3. la même soumission rejouée (nouvel horodatage, même identifiant) → 200 {id identique, nouvelle: false} ;
//   4. une seule ligne dans public.receptions pour cet identifiant, canal formulaire, boîte site:omegaai.fr.
// La porte deposer_reception publie reception.nouvelle : le module reput du client du banc voit passer l'essai.

const RECETTE = "https://ygwbgpowzlbdaajlsqkn.supabase.co";

const secret = Deno.env.get("FORMULAIRE_SECRET")?.trim();
if (!secret) {
  console.error(
    "FORMULAIRE_SECRET manquant dans l'environnement : rien n'est envoyé.",
  );
  Deno.exit(2);
}
const url = Deno.args[0] ?? `${RECETTE}/functions/v1/reception/formulaire`;
const base = new URL(url).origin;
const cleService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || null;

const identifiant = crypto.randomUUID();
const corps = JSON.stringify({
  identifiant,
  formulaire: "contact",
  nom: "Essai répétition générale (banc A2)",
  email: "repetition@banc-a2.test",
  societe: "Banc A2",
  message: "Essai de la coquille reception par le formulaire signé. À ignorer.",
  page: "/banc/preuve-formulaire",
  consentement: true,
  champs: { origine: "omega/functions/reception/outils/preuve_formulaire.ts" },
});

async function hmacHex(cle: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cle),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function poster(
  signature?: string,
): Promise<{ statut: number; json: Record<string, unknown> }> {
  const horodatage = String(Math.floor(Date.now() / 1000));
  const sig = signature ?? await hmacHex(secret!, `${horodatage}.${corps}`);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Omega-Horodatage": horodatage,
      "X-Omega-Signature": sig,
    },
    body: corps,
  });
  const texte = await r.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(texte);
  } catch {
    json = { brut: texte.slice(0, 500) };
  }
  return { statut: r.status, json };
}

let echecs = 0;
function controle(nom: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? "OK   " : "ÉCHEC"} ${nom} : ${JSON.stringify(detail)}`);
  if (!ok) echecs++;
}

console.log(`fonction : ${url}`);
console.log(`identifiant de la soumission : ${identifiant}`);

// 1. Signature fausse : refusée, rien n'est écrit.
const faux = await poster("0".repeat(64));
controle("1. signature fausse → 401", faux.statut === 401, faux);

// 2. Requête signée : réception déposée.
const premier = await poster();
controle(
  "2. signée → 201, nouvelle",
  premier.statut === 201 && premier.json.nouvelle === true &&
    typeof premier.json.id !== "undefined",
  premier,
);

// 3. Rejeu de la même soumission : même ligne, pas de doublon.
const second = await poster();
controle(
  "3. rejeu → 200, même id, pas nouvelle",
  second.statut === 200 && second.json.nouvelle === false &&
    String(second.json.id) === String(premier.json.id),
  second,
);

// 4. La ligne déposée.
const sql =
  `select id, client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, sujet, statut, recu_le, cree_le, detail
from public.receptions where canal = 'formulaire' and identifiant_externe = '${identifiant}';
-- → attendu : une seule ligne, boite site:omegaai.fr, de_adresse repetition@banc-a2.test, statut nouvelle, id = ${
    String(premier.json.id)
  }.`;
if (cleService) {
  const r = await fetch(
    `${base}/rest/v1/receptions?canal=eq.formulaire&identifiant_externe=eq.${identifiant}` +
      `&select=id,client_id,module,boite,identifiant_externe,de_adresse,statut,recu_le`,
    { headers: { apikey: cleService, Authorization: `Bearer ${cleService}` } },
  );
  const lignes = r.ok ? await r.json() as Record<string, unknown>[] : [];
  controle(
    "4. une seule ligne dans public.receptions, boîte site:omegaai.fr",
    r.ok && lignes.length === 1 && lignes[0].boite === "site:omegaai.fr" &&
      String(lignes[0].id) === String(premier.json.id),
    r.ok ? lignes : { statut: r.status, corps: (await r.text()).slice(0, 300) },
  );
} else {
  console.log(
    "\n4. contrôle en base (pas de SUPABASE_SERVICE_ROLE_KEY) — à passer à la main :\n" +
      sql,
  );
}

if (echecs > 0) console.log(`\n${echecs} contrôle(s) en échec.`);
else if (cleService) {
  console.log(
    "\nPREUVE : chemin utile de la coquille reception (formulaire) vérifié, base comprise.",
  );
} else {console.log(
    "\nContrôles 1 à 3 OK ; la preuve est complète quand la requête du contrôle 4 rend une seule ligne.",
  );}
Deno.exit(echecs === 0 ? 0 : 1);
