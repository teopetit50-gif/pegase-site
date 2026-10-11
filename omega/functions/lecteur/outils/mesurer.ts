// Mesurer le lecteur sur un corpus réel (CHIFFRAGE/lecteur.md : passer de B à A). Lecture seule : rien n'est écrit en base.
//
//   1. Préparer l'attendu : déposer les pièces du corpus sur la recette (par l'écran du module), attendre leur lecture, puis
//      deno run -A outils/mesurer.ts --squelette factures-pilote --client <uuid> --depuis 2026-10-11 [--module filed] > corpus.json
//      Le squelette reprend les valeurs LUES : une personne les relit sur chaque pièce et corrige ce qui est faux
//      (null = « il n'y en a pas sur la pièce »). C'est l'attendu.
//   2. Mesurer : deno run -A outils/mesurer.ts --corpus corpus.json --client <uuid> > rapport.md
//      Précision, rappel, « vérifiées et fausses », coût, tableau par champ, chaque écart.
//
// Accès : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (le coût vient alors des travaux), ou SUPABASE_ANON_KEY avec
// --session <fichier.json> (session d'un gérant : il voit les pièces et valeurs de son organisation, pas les travaux).
// Les pièces chiffrées (Tamila) ne se mesurent pas ici : leurs valeurs ne sont lisibles qu'avec la clé du dossier.

import { type Corpus, comparerPiece, type PieceAttendue, type PieceLue, rapport, type ResultatPiece, squelette } from "../mesure/comparer.ts";

export interface SourceMesure {
  /** La pièce (non fille) du client qui correspond à l'attendu, et ce que le lecteur en a rangé ; null si introuvable. */
  pieceLue(client: string, a: PieceAttendue): Promise<PieceLue | null>;
  /** Les pièces lues d'un module depuis une date, pour le squelette. */
  piecesDepuis(client: string, module: string, depuis: string): Promise<{ sha256: string; nom: string; lu: PieceLue }[]>;
}

export class SourceRest implements SourceMesure {
  constructor(
    private readonly url: string,
    private readonly entetes: Record<string, string>,
    private readonly avecTravaux: boolean,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async lire<T>(chemin: string): Promise<T> {
    const r = await this.fetchFn(`${this.url}/rest/v1/${chemin}`, { headers: this.entetes });
    if (!r.ok) throw new Error(`${chemin.split("?")[0]} : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return await r.json() as T;
  }

  private async completer(p: { id: string; statut: string; type_piece: string | null; chiffrement: string | null }): Promise<PieceLue | null> {
    if (p.chiffrement) return null;
    const valeurs = await this.lire<{ champ: string; valeur: unknown; verifiee: boolean }[]>(
      `pieces_valeurs?piece_id=eq.${p.id}&select=champ,valeur,verifiee`,
    );
    let cout: number | null = null;
    if (this.avecTravaux) {
      const [t] = await this.lire<{ resultat: { cout_eur?: number } | null }[]>(
        `travaux?genre=eq.lecteur.lire&charge->>piece=eq.${p.id}&etat=eq.fait&select=resultat&order=id.desc&limit=1`,
      );
      cout = typeof t?.resultat?.cout_eur === "number" ? t.resultat.cout_eur : null;
    }
    return { type_piece: p.type_piece, statut: p.statut, valeurs, cout_eur: cout };
  }

  async pieceLue(client: string, a: PieceAttendue): Promise<PieceLue | null> {
    const filtre = a.sha256 ? `sha256=eq.${encodeURIComponent(a.sha256)}` : `nom_fichier=eq.${encodeURIComponent(a.fichier ?? "")}`;
    const [p] = await this.lire<{ id: string; statut: string; type_piece: string | null; chiffrement: string | null }[]>(
      `pieces?client_id=eq.${client}&${filtre}&select=id,statut,type_piece,chiffrement&order=recue_le.desc&limit=1`,
    );
    if (!p || ["recue", "en_lecture"].includes(p.statut)) return null;
    return await this.completer(p);
  }

  async piecesDepuis(client: string, module: string, depuis: string) {
    const pieces = await this.lire<{ id: string; statut: string; type_piece: string | null; chiffrement: string | null; sha256: string; nom_fichier: string }[]>(
      `pieces?client_id=eq.${client}&module=eq.${module}&recue_le=gte.${depuis}&statut=in.(lue,a_verifier,a_classer)&select=id,statut,type_piece,chiffrement,sha256,nom_fichier&order=recue_le.asc&limit=500`,
    );
    const lus = [];
    for (const p of pieces) {
      const lu = await this.completer(p);
      if (lu) lus.push({ sha256: p.sha256, nom: p.nom_fichier, lu });
    }
    return lus;
  }
}

export async function mesurer(source: SourceMesure, corpus: Corpus, client: string): Promise<ResultatPiece[]> {
  const resultats: ResultatPiece[] = [];
  for (const a of corpus.pieces) {
    const cle = a.fichier ?? a.sha256?.slice(0, 12) ?? "?";
    resultats.push(comparerPiece(cle, a, await source.pieceLue(client, a)));
  }
  return resultats;
}

function argument(nom: string): string | undefined {
  const i = Deno.args.indexOf(`--${nom}`);
  return i >= 0 ? Deno.args[i + 1] : undefined;
}

if (import.meta.main) {
  const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const fichierSession = argument("session");
  const client = argument("client");
  if (!url || !client || !(service || (anon && fichierSession))) {
    console.error("usage : --client <uuid> (--corpus corpus.json | --squelette <nom> --depuis AAAA-MM-JJ [--module filed]) ; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, ou SUPABASE_ANON_KEY + --session <fichier>");
    Deno.exit(2);
  }
  const jeton = service ?? JSON.parse(await Deno.readTextFile(fichierSession!)).access_token;
  const source = new SourceRest(url, { apikey: service ?? anon!, Authorization: `Bearer ${jeton}` }, !!service);
  const nomSquelette = argument("squelette");
  if (nomSquelette) {
    const module = argument("module") ?? "filed";
    const lus = await source.piecesDepuis(client, module, argument("depuis") ?? new Date().toISOString().slice(0, 10));
    console.log(JSON.stringify(squelette(nomSquelette, module, lus), null, 2));
  } else {
    const corpus = JSON.parse(await Deno.readTextFile(argument("corpus") ?? "corpus.json")) as Corpus;
    const resultats = await mesurer(source, corpus, client);
    console.log(rapport(corpus, resultats, new Date().toISOString().slice(0, 16).replace("T", " ") + " Z"));
  }
}
