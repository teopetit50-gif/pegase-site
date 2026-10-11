// preuve_formulaire_reput — Preuve EN VRAI de REPUT par le formulaire signé (session C3, 11/10/2026).
// Même protocole que l'outil d'A2 (omega/functions/reception/outils/preuve_formulaire.ts : HMAC-SHA256 de
// « horodatage.corps », en-têtes X-Omega-Horodatage / X-Omega-Signature), mais une VRAIE question de client,
// couverte par les fiches du banc (diagnostic 89 € TTC, samedi 9 h-12 h) : la réponse doit être préparée dans
// la minute, citer ces deux fiches et attendre la validation. Écrit UNE réception ; rien n'est effacé.
//
//   FORMULAIRE_SECRET=… deno run --allow-env --allow-net omega/functions/reput-reponse/outils/preuve_formulaire_reput.ts [URL] [adresse]
//   [adresse] : l'adresse de l'expéditeur (défaut : essais@omegaai.fr). En mode essai, la réponse part de toute
//   façon à l'adresse d'essai du banc.
//   (facultatif) SUPABASE_SERVICE_ROLE_KEY=… : le script attend lui-même la réponse préparée (2 min au plus) ;
//   sans elle, il imprime l'identifiant de la réception pour preuve_vraie.sql.
// Aucun secret n'est imprimé ; aucun contenu de réponse n'est imprimé au-delà du sujet et des contrôles.

const RECETTE = "https://ygwbgpowzlbdaajlsqkn.supabase.co";

const secret = Deno.env.get("FORMULAIRE_SECRET")?.trim();
if (!secret) {
  console.error(
    "FORMULAIRE_SECRET manquant dans l'environnement : rien n'est envoyé.",
  );
  Deno.exit(2);
}
const url = Deno.args[0] ?? `${RECETTE}/functions/v1/reception/formulaire`;
const adresse = Deno.args[1] ?? "essais@omegaai.fr";
const base = new URL(url).origin;
const cleService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || null;

const identifiant = crypto.randomUUID();
const corps = JSON.stringify({
  identifiant,
  formulaire: "contact",
  nom: "Preuve REPUT (banc C3)",
  email: adresse,
  message:
    "Bonjour, combien coûte le diagnostic à domicile ? Et êtes-vous ouverts le samedi matin ? Merci.",
  page: "/banc/preuve-reput",
  consentement: true,
  champs: {
    origine: "omega/functions/reput-reponse/outils/preuve_formulaire_reput.ts",
  },
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

async function lire(chemin: string): Promise<Record<string, unknown>[]> {
  const r = await fetch(`${base}/rest/v1/${chemin}`, {
    headers: { apikey: cleService!, Authorization: `Bearer ${cleService}` },
  });
  return r.ok ? await r.json() as Record<string, unknown>[] : [];
}

const depart = Date.now();
const horodatage = String(Math.floor(depart / 1000));
const r = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Omega-Horodatage": horodatage,
    "X-Omega-Signature": await hmacHex(secret, `${horodatage}.${corps}`),
  },
  body: corps,
});
const reponse = await r.json().catch(() => ({})) as Record<string, unknown>;
console.log(`fonction : ${url}`);
console.log(`dépôt : ${r.status} ${JSON.stringify(reponse)}`);
if (r.status !== 201 || reponse.id === undefined) Deno.exit(1);
const reception = String(reponse.id);
console.log(`réception : ${reception} (à reporter dans preuve_vraie.sql)`);

if (!cleService) {
  console.log(
    "Pas de SUPABASE_SERVICE_ROLE_KEY : passer preuve_vraie.sql (blocs 1 à 4) dans deux minutes.",
  );
  Deno.exit(0);
}

// Attendre la demande REPUT et sa réponse préparée.
let echecs = 0;
const controle = (nom: string, ok: boolean, detail: unknown) => {
  console.log(`${ok ? "OK   " : "ÉCHEC"} ${nom} : ${JSON.stringify(detail)}`);
  if (!ok) echecs++;
};
let demande: Record<string, unknown> | undefined;
for (let i = 0; i < 24; i++) {
  [demande] = await lire(
    `reput_demandes?reception_id=eq.${reception}&select=id,client_id,statut,sujet,langue,couverte,recu_le,preparee_le,accuse_le`,
  );
  if (demande?.preparee_le) break;
  await new Promise((f) => setTimeout(f, 5000));
}
controle(
  "1. demande REPUT créée pour la réception",
  demande !== undefined,
  demande?.statut ?? null,
);
if (demande) {
  const secondes = demande.preparee_le
    ? Math.round(
      (Date.parse(String(demande.preparee_le)) -
        Date.parse(String(demande.recu_le))) / 1000,
    )
    : null;
  controle(
    "2. réponse préparée en moins de 60 s",
    secondes !== null && secondes < 60,
    { secondes },
  );
  const [rep] = await lire(
    `reput_reponses?demande_id=eq.${demande.id}&select=sujet,couverte,sources,statut,type_action,modele,cout_eur&order=version.desc&limit=1`,
  );
  controle(
    "3. réponse couverte par la base, au moins une fiche citée",
    rep?.couverte === true && Array.isArray(rep?.sources) &&
      (rep.sources as unknown[]).length > 0,
    rep
      ? {
        sujet: rep.sujet,
        couverte: rep.couverte,
        sources: (rep.sources as unknown[]).length,
        modele: rep.modele,
        cout_eur: rep.cout_eur,
      }
      : null,
  );
  controle(
    "4. elle attend la validation (rien n'est parti seul)",
    rep?.statut === "a_valider",
    rep?.statut ?? null,
  );
}
console.log(
  echecs === 0
    ? "\nContrôles 1 à 4 OK : il reste la validation dans « À valider » puis la réception du courriel (PREUVE-VRAIE.md)."
    : `\n${echecs} contrôle(s) en échec : passer preuve_vraie.sql pour le détail.`,
);
Deno.exit(echecs === 0 ? 0 : 1);
