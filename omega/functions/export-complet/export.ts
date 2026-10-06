// L'export complet d'un client (lot socle 19aj) : les données en base (exporter_donnees_client) et tous ses fichiers du
// bucket omega-clients, dans un zip chiffré AES-256 par un mot de passe tiré au hasard, rendu une seule fois.
// Le zip est déposé dans le bucket privé omega-exports ; le gérant reçoit un lien signé valable 24 heures.
// Ce module ne parle à Supabase qu'à travers `Acces` : index.ts branche le vrai, les tests un faux.

import { configure, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";

configure({ useWebWorkers: false });

export const BUCKET_EXPORTS = "omega-exports";
export const DUREE_LIEN_S = 24 * 3600;
// Tout passe en mémoire (fichiers puis zip) : la limite de mémoire d'une fonction Edge borne le plafond.
export const MAX_OCTETS_DEFAUT = 150 * 1024 * 1024;

export interface Acces {
  /** RPC au nom du gérant (son jeton) : les droits sont vérifiés en base. */
  rpcGerant(nom: string, args: Record<string, unknown>): Promise<unknown>;
  /** RPC avec la clé de service (portes private.* du lot 19aj). */
  rpcService(nom: string, args: Record<string, unknown>): Promise<unknown>;
  /** Un fichier du bucket omega-clients ; null s'il est absent. */
  telecharger(chemin: string): Promise<Uint8Array | null>;
  deposer(bucket: string, chemin: string, octets: Uint8Array): Promise<void>;
  signer(bucket: string, chemin: string, secondes: number): Promise<string>;
  retirer(bucket: string, chemins: string[]): Promise<void>;
}

export interface Resultat {
  export_id: string;
  lien: string;
  mot_de_passe: string;
  expire_le: string;
  nb_fichiers: number;
  fichiers_manquants: number;
  octets: number;
  sha256: string;
}

export class ErreurExport extends Error {
  constructor(readonly statut: number, message: string) {
    super(message);
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Mot de passe de 24 caractères (≈ 140 bits), sans caractères ambigus. */
export function motDePasse(longueur = 24): string {
  const sortie: string[] = [];
  const limite = 256 - (256 % ALPHABET.length);
  while (sortie.length < longueur) {
    for (const o of crypto.getRandomValues(new Uint8Array(longueur * 2))) {
      if (o < limite && sortie.length < longueur) sortie.push(ALPHABET[o % ALPHABET.length]);
    }
  }
  return sortie.join("");
}

async function sha256(octets: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", octets as unknown as BufferSource));
  return Array.from(h, (o) => o.toString(16).padStart(2, "0")).join("");
}

const texte = (t: string) => new TextEncoder().encode(t);

/** Retire du bucket les zips échus et les marque « expire ». Une panne ici ne bloque pas un nouvel export. */
export async function purgerExpires(acces: Acces): Promise<number> {
  const echus = (await acces.rpcService("exports_complets_expires", {})) as { id: string; chemin: string | null }[];
  if (!echus?.length) return 0;
  const chemins = echus.map((e) => e.chemin).filter((c): c is string => !!c);
  if (chemins.length) await acces.retirer(BUCKET_EXPORTS, chemins);
  for (const e of echus) await acces.rpcService("export_complet_expire", { p_export: e.id });
  return echus.length;
}

export async function produireExport(
  acces: Acces,
  client: string,
  demandeur: string,
  options: { maxOctets?: number; maintenant?: () => Date } = {},
): Promise<Resultat> {
  const maxOctets = options.maxOctets ?? MAX_OCTETS_DEFAUT;
  const maintenant = options.maintenant ?? (() => new Date());

  // 1. La demande, au nom du gérant : refusée en base s'il n'est pas gérant du client (42501) ou si un export est en cours.
  const exportId = (await acces.rpcGerant("demander_export_complet", { p_client: client })) as string;
  try {
    // 2. Les données en base : la porte du service exporter_donnees_client (exporter_client n'est pas exposée), qui
    //    vérifie elle aussi que le demandeur est gérant du client. Le demandeur est le sujet du jeton vérifié.
    const donnees = await acces.rpcService("exporter_donnees_client", { p_client: client, p_demandeur: demandeur });

    // 3. Les fichiers.
    const fichiers = (await acces.rpcService("export_complet_fichiers", { p_export: exportId })) as {
      chemin: string;
      octets: number;
    }[];
    const total = fichiers.reduce((s, f) => s + Number(f.octets || 0), 0);
    if (total > maxOctets) {
      throw new ErreurExport(
        413,
        `fichiers trop volumineux pour un export en un clic (${Math.ceil(total / 1048576)} Mo, plafond ` +
          `${Math.floor(maxOctets / 1048576)} Mo) : demander un export accompagné`,
      );
    }

    const mdp = motDePasse();
    const zip = new ZipWriter(new Uint8ArrayWriter(), { password: mdp, encryptionStrength: 3, zipCrypto: false });
    const manifeste = ["chemin;octets;sha256;present"];
    const manquants: string[] = [];
    let presents = 0;
    for (const f of fichiers) {
      const octets = await acces.telecharger(f.chemin);
      if (!octets) {
        manquants.push(f.chemin);
        manifeste.push(`${f.chemin};${f.octets};;non`);
        continue;
      }
      await zip.add(`fichiers/${f.chemin}`, new Uint8ArrayReader(octets));
      manifeste.push(`${f.chemin};${octets.length};${await sha256(octets)};oui`);
      presents++;
    }
    const json = texte(JSON.stringify(donnees, null, 2));
    await zip.add("donnees/export.json", new Uint8ArrayReader(json));
    await zip.add("MANIFESTE.csv", new Uint8ArrayReader(texte(manifeste.join("\n") + "\n")));
    await zip.add(
      "LISEZMOI.txt",
      new Uint8ArrayReader(texte([
        "Export complet Omega",
        `Client : ${client}`,
        `Export : ${exportId}, produit le ${maintenant().toISOString()}`,
        "",
        "donnees/export.json : toutes vos données en base, au format JSON (empreinte SHA-256 : " +
        (await sha256(json)) + ").",
        `fichiers/ : vos ${presents} fichiers, rangés comme dans Omega. MANIFESTE.csv donne la taille et l'empreinte de chacun.`,
        manquants.length
          ? `${manquants.length} fichier(s) inscrit(s) mais introuvable(s) au moment de l'export : voir MANIFESTE.csv (present = non).`
          : "Aucun fichier manquant.",
        "Les pièces chiffrées de bout en bout (Tamila) sont livrées telles qu'elles sont rangées : chiffrées avec la clé de votre cabinet.",
        "",
      ].join("\n"))),
    );
    const octetsZip = await zip.close();
    const empreinte = await sha256(octetsZip);

    // 4. Dépôt, lien signé, issue inscrite.
    const chemin = `${client}/${exportId}.zip`;
    await acces.deposer(BUCKET_EXPORTS, chemin, octetsZip);
    const lien = await acces.signer(BUCKET_EXPORTS, chemin, DUREE_LIEN_S);
    const expire = new Date(maintenant().getTime() + DUREE_LIEN_S * 1000);
    await acces.rpcService("export_complet_fini", {
      p_export: exportId,
      p_chemin: chemin,
      p_octets: octetsZip.length,
      p_sha256: empreinte,
      p_nb: presents,
      p_manquants: manquants.length,
      p_expire: expire.toISOString(),
    });
    return {
      export_id: exportId,
      lien,
      mot_de_passe: mdp,
      expire_le: expire.toISOString(),
      nb_fichiers: presents,
      fichiers_manquants: manquants.length,
      octets: octetsZip.length,
      sha256: empreinte,
    };
  } catch (e) {
    await acces.rpcService("export_complet_echec", { p_export: exportId, p_erreur: (e as Error).message }).catch(
      () => {},
    );
    throw e;
  }
}
