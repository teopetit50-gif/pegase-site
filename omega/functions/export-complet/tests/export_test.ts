// Tests de l'export complet avec un faux Supabase : le zip se rouvre avec le mot de passe rendu, et seulement avec lui.
import { assert, assertEquals, assertRejects } from "@std/assert";
import { BlobReader, TextWriter, Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { type Acces, ErreurExport, motDePasse, produireExport, purgerExpires } from "../export.ts";

const CLIENT = "11111111-1111-4111-8111-111111111111";

function faux(options: { refus?: string; fichiers?: { chemin: string; octets: number }[]; absents?: string[] } = {}) {
  const appels: { nom: string; args: Record<string, unknown> }[] = [];
  const depots = new Map<string, Uint8Array>();
  const retires: string[] = [];
  const fichiers = options.fichiers ?? [
    { chemin: `${CLIENT}/filed/facture.pdf`, octets: 5 },
    { chemin: `${CLIENT}/tamila/acte.bin`, octets: 3 },
  ];
  const acces: Acces = {
    rpcGerant(nom, args) {
      appels.push({ nom, args });
      if (nom === "demander_export_complet") {
        if (options.refus) return Promise.reject(new ErreurExport(403, options.refus));
        return Promise.resolve("22222222-2222-4222-8222-222222222222");
      }
      if (nom === "exporter_client") return Promise.resolve({ client: CLIENT, factures: [{ n: 1 }] });
      return Promise.reject(new Error("rpc inattendue " + nom));
    },
    rpcService(nom, args) {
      appels.push({ nom, args });
      if (nom === "export_complet_fichiers") return Promise.resolve(fichiers);
      if (nom === "exports_complets_expires") return Promise.resolve([{ id: "e1", chemin: `${CLIENT}/e1.zip` }]);
      return Promise.resolve(null);
    },
    telecharger(chemin) {
      if (options.absents?.includes(chemin)) return Promise.resolve(null);
      return Promise.resolve(new TextEncoder().encode(chemin.endsWith(".pdf") ? "%PDF-" : "\x01ab"));
    },
    deposer(bucket, chemin, octets) {
      depots.set(`${bucket}/${chemin}`, octets);
      return Promise.resolve();
    },
    signer(bucket, chemin, secondes) {
      return Promise.resolve(`https://exemple.invalid/${bucket}/${chemin}?token=x&expire=${secondes}`);
    },
    retirer(_bucket, chemins) {
      retires.push(...chemins);
      return Promise.resolve();
    },
  };
  return { acces, appels, depots, retires };
}

async function ouvrir(zip: Uint8Array, mdp: string): Promise<Map<string, string>> {
  const lecteur = new ZipReader(new Uint8ArrayReader(zip), { password: mdp });
  const contenu = new Map<string, string>();
  for (const e of await lecteur.getEntries()) {
    if (!e.directory && e.getData) contenu.set(e.filename, await e.getData(new TextWriter()));
  }
  await lecteur.close();
  return contenu;
}

Deno.test("le zip contient les données, les fichiers, le manifeste, et s'ouvre avec le mot de passe rendu", async () => {
  const { acces, appels, depots } = faux();
  const r = await produireExport(acces, CLIENT, { maintenant: () => new Date("2026-10-06T16:00:00Z") });
  assertEquals(r.nb_fichiers, 2);
  assertEquals(r.fichiers_manquants, 0);
  assertEquals(r.expire_le, "2026-10-07T16:00:00.000Z");
  assert(r.lien.includes("omega-exports"));
  const zip = depots.get(`omega-exports/${CLIENT}/${r.export_id}.zip`)!;
  assertEquals(zip.length, r.octets);
  const c = await ouvrir(zip, r.mot_de_passe);
  assertEquals(c.get(`fichiers/${CLIENT}/filed/facture.pdf`), "%PDF-");
  assertEquals(JSON.parse(c.get("donnees/export.json")!).factures[0].n, 1);
  assert(c.get("MANIFESTE.csv")!.includes(`${CLIENT}/tamila/acte.bin;3;`));
  assert(c.get("LISEZMOI.txt")!.includes("Aucun fichier manquant"));
  const fini = appels.find((a) => a.nom === "export_complet_fini")!;
  assertEquals(fini.args.p_sha256, r.sha256);
  assert(!JSON.stringify(appels).includes(r.mot_de_passe), "le mot de passe n'est transmis à aucune porte");
});

Deno.test("sans le bon mot de passe, le contenu ne se lit pas", async () => {
  const { acces, depots } = faux();
  const r = await produireExport(acces, CLIENT);
  const zip = depots.get(`omega-exports/${CLIENT}/${r.export_id}.zip`)!;
  await assertRejects(() => ouvrir(zip, "mauvais-mot-de-passe"));
  // Et rien n'est lisible en clair dans le zip.
  const brut = new TextDecoder("latin1").decode(zip);
  assert(!brut.includes("%PDF-") && !brut.includes("factures"));
  // Les noms d'entrée restent visibles : c'est le format zip (seul le contenu est chiffré).
  const lecteur = new ZipReader(new BlobReader(new Blob([zip as unknown as BlobPart])));
  assert((await lecteur.getEntries()).every((e) => e.encrypted));
  await lecteur.close();
});

Deno.test("un fichier absent est signalé, pas fatal", async () => {
  const { acces, depots } = faux({ absents: [`${CLIENT}/tamila/acte.bin`] });
  const r = await produireExport(acces, CLIENT);
  assertEquals(r.nb_fichiers, 1);
  assertEquals(r.fichiers_manquants, 1);
  const c = await ouvrir(depots.get(`omega-exports/${CLIENT}/${r.export_id}.zip`)!, r.mot_de_passe);
  assert(c.get("MANIFESTE.csv")!.includes(`${CLIENT}/tamila/acte.bin;3;;non`));
});

Deno.test("refus en base : rien n'est produit", async () => {
  const { acces, depots, appels } = faux({ refus: "export complet réservé au gérant du client" });
  const e = await assertRejects(() => produireExport(acces, CLIENT), ErreurExport);
  assertEquals(e.statut, 403);
  assertEquals(depots.size, 0);
  assert(!appels.some((a) => a.nom === "export_complet_fichiers"));
});

Deno.test("au-delà du plafond : échec inscrit, rien déposé", async () => {
  const { acces, depots, appels } = faux({ fichiers: [{ chemin: `${CLIENT}/gros.bin`, octets: 2_000_000 }] });
  const e = await assertRejects(() => produireExport(acces, CLIENT, { maxOctets: 1_000_000 }), ErreurExport);
  assertEquals(e.statut, 413);
  assertEquals(depots.size, 0);
  assert(appels.some((a) => a.nom === "export_complet_echec"));
});

Deno.test("purge : les zips échus sont retirés puis marqués", async () => {
  const { acces, appels, retires } = faux();
  assertEquals(await purgerExpires(acces), 1);
  assertEquals(retires, [`${CLIENT}/e1.zip`]);
  assert(appels.some((a) => a.nom === "export_complet_expire" && a.args.p_export === "e1"));
});

Deno.test("mot de passe : 24 caractères, sans ambiguïté, jamais deux fois le même", () => {
  const a = motDePasse(), b = motDePasse();
  assertEquals(a.length, 24);
  assert(/^[A-HJ-NP-Za-km-z2-9]+$/.test(a));
  assert(a !== b);
  // Le zip se crée bien avec Uint8ArrayWriter (import utilisé par export.ts).
  assert(new Uint8ArrayWriter());
});
