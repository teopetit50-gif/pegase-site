// Lecture seule des pièces jointes dans le bucket omega-clients (API Storage, clé de service).

export interface Stockage {
  lirePiece(piece: { id: string; chemin: string }): Promise<Uint8Array>;
}

export const BUCKET = "omega-clients";

export function stockageSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): Stockage {
  return {
    async lirePiece(piece) {
      if (!piece.chemin) throw new Error(`pièce ${piece.id} sans chemin`);
      const chemin = piece.chemin.split("/").map(encodeURIComponent).join("/");
      const reponse = await fetchImpl(
        `${url}/storage/v1/object/${BUCKET}/${chemin}`,
        {
          headers: {
            apikey: cleService,
            Authorization: `Bearer ${cleService}`,
          },
        },
      );
      if (!reponse.ok) {
        throw new Error(
          `pièce ${piece.id} illisible : HTTP ${reponse.status} ${
            (await reponse.text()).slice(0, 200)
          }`,
        );
      }
      return new Uint8Array(await reponse.arrayBuffer());
    },
  };
}

export function versBase64(octets: Uint8Array): string {
  let chaine = "";
  const bloc = 0x8000;
  for (let i = 0; i < octets.length; i += bloc) {
    chaine += String.fromCharCode(...octets.subarray(i, i + bloc));
  }
  return btoa(chaine);
}
