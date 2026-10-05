// Outils partagés par les trois entrées de la réception.

import type { Canal, PieceRecue, Portes, Reception } from "./portes.ts";

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export const journalMuet: Journal = { info: () => {}, erreur: () => {} };

/** Dépôt d'objets dans le bucket omega-clients (upsert : une relivraison réécrit le même objet). */
export interface Stockage {
  deposer(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    typeMime: string,
  ): Promise<void>;
}

export const BUCKET = "omega-clients";

export function stockageSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): Stockage {
  return {
    async deposer(chemin, octets, typeMime) {
      const cheminUrl = chemin.split("/").map(encodeURIComponent).join("/");
      const reponse = await fetchImpl(
        `${url}/storage/v1/object/${BUCKET}/${cheminUrl}`,
        {
          method: "POST",
          headers: {
            apikey: cleService,
            Authorization: `Bearer ${cleService}`,
            "Content-Type": typeMime || "application/octet-stream",
            "x-upsert": "true",
          },
          body: octets,
        },
      );
      if (!reponse.ok) {
        throw new Error(
          `dépôt de ${chemin} refusé : HTTP ${reponse.status} ${
            (await reponse.text()).slice(0, 200)
          }`,
        );
      }
    },
  };
}

export async function sha256Hex(
  donnees: string | Uint8Array<ArrayBuffer>,
): Promise<string> {
  const octets = typeof donnees === "string"
    ? new TextEncoder().encode(donnees)
    : donnees;
  const h = await crypto.subtle.digest("SHA-256", octets);
  return hex(new Uint8Array(h));
}

export async function hmacSha256Hex(
  secret: string,
  message: string | Uint8Array<ArrayBuffer>,
): Promise<string> {
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const octets = typeof message === "string"
    ? new TextEncoder().encode(message)
    : message;
  const sig = await crypto.subtle.sign("HMAC", cle, octets);
  return hex(new Uint8Array(sig));
}

export function hex(octets: Uint8Array): string {
  return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

/** Comparaison en temps constant de deux chaînes. */
export function memeSecret(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** Nom de fichier sûr pour le bucket : pas de chemin, pas de caractère de contrôle. */
export function nomSur(nom: string | null | undefined, repli: string): string {
  const base = (nom ?? "").split(/[\\/]/).pop() ?? "";
  // deno-lint-ignore no-control-regex
  const propre = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ")
    .trim().slice(0, 120);
  return propre || repli;
}

/** Identifiant externe rendu sûr pour un segment de chemin : <…@…> → sans chevrons, caractères hors [A-Za-z0-9._@-] remplacés. */
export function segmentSur(identifiant: string): string {
  const propre = identifiant.trim().replace(/^<|>$/g, "").replace(
    /[^A-Za-z0-9._@-]/g,
    "_",
  ).slice(0, 120);
  return propre.replace(/^\.+/, "") || "sans-id";
}

/** Chemin d'une pièce reçue, forme posée par le coordinateur : <client>/receptions/<id externe>/<nom>. */
export function cheminPiece(
  client: string,
  identifiant: string,
  nom: string,
): string {
  return `${client}/receptions/${segmentSur(identifiant)}/${nom}`;
}

export type PieceADeposer = {
  nom: string;
  typeMime: string;
  octets: Uint8Array<ArrayBuffer>;
};

/** Dépose les pièces dans le bucket et rend leur description pour deposer_reception. */
export async function deposerPieces(
  stockage: Stockage,
  client: string,
  identifiant: string,
  pieces: PieceADeposer[],
): Promise<PieceRecue[]> {
  const recues: PieceRecue[] = [];
  const nomsVus = new Set<string>();
  let rang = 0;
  for (const p of pieces) {
    rang++;
    let nom = nomSur(p.nom, `piece-${rang}`);
    // Deux pièces du même nom dans un même message : la seconde est préfixée de son rang.
    if (nomsVus.has(nom)) nom = `${rang}-${nom}`;
    nomsVus.add(nom);
    const chemin = cheminPiece(client, identifiant, nom);
    await stockage.deposer(chemin, p.octets, p.typeMime);
    recues.push({
      nom,
      mime: p.typeMime || "application/octet-stream",
      taille: p.octets.byteLength,
      chemin,
    });
  }
  return recues;
}

export function normaliserAdresse(adresse: string): string {
  return adresse.trim().toLowerCase();
}

export function reponseJson(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

export type Issue = {
  identifiant: string;
  sortie: "nouvelle" | "deja_recue" | "boite_inconnue" | "erreur";
  id?: number;
  erreur?: string;
};

/** Résout la boîte, dépose les pièces puis la réception. Rend l'issue ; ne lève jamais. */
export async function recevoir(
  deps: { portes: Portes; stockage: Stockage; journal: Journal },
  canal: Canal,
  boites: string[],
  identifiant: string,
  pieces: PieceADeposer[],
  construire: (
    client: string,
    boite: string,
    pieces: PieceRecue[],
  ) => Reception,
): Promise<Issue> {
  try {
    let boite: { nom: string; client: string } | null = null;
    for (const nom of boites) {
      const r = await deps.portes.resoudreBoite(canal, nom);
      if (r) {
        boite = { nom, client: r.client_id };
        break;
      }
    }
    if (!boite) {
      deps.journal.erreur("boîte inconnue, réception ignorée", {
        canal,
        boites,
        identifiant,
      });
      return { identifiant, sortie: "boite_inconnue" };
    }
    const deposees = await deposerPieces(
      deps.stockage,
      boite.client,
      identifiant,
      pieces,
    );
    const depot = await deps.portes.deposerReception(
      construire(boite.client, boite.nom, deposees),
    );
    deps.journal.info(
      depot.nouvelle ? "réception déposée" : "réception déjà connue",
      { canal, identifiant, id: depot.id, pieces: deposees.length },
    );
    return {
      identifiant,
      sortie: depot.nouvelle ? "nouvelle" : "deja_recue",
      id: depot.id,
    };
  } catch (e) {
    const erreur = String(e).slice(0, 300);
    deps.journal.erreur("réception en erreur", { canal, identifiant, erreur });
    return { identifiant, sortie: "erreur", erreur };
  }
}
