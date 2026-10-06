// La transcription des vocaux : Claude ne lit pas l'audio, le vocal passe d'abord par un service de transcription.
// Mistral (Voxtral, hébergé dans l'Union européenne), avec la même clé que l'OCR (MISTRAL_API_KEY) : un
// sous-traitant déjà retenu pour le lecteur. Sans clé, les vocaux sont notés « non transcrits », jamais inventés.

import { ErreurOuvrier } from "@partage/erreurs.ts";

export interface Transcription {
  texte: string;
  langue?: string;
  duree_s?: number;
  cout_eur: number;
}

export interface Transcripteur {
  readonly nom: string;
  transcrire(octets: Uint8Array, mime: string, nom: string): Promise<Transcription>;
}

export interface ConfigTranscription {
  cle: string;
  modele: string;
  /** Dollars par minute d'audio. */
  prixUsdMinute: number;
  tauxUsdEur: number;
}

export function configTranscriptionDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ConfigTranscription | null {
  const cle = env.get("MISTRAL_API_KEY");
  if (!cle) return null;
  const prix = Number(env.get("MISTRAL_TRANSCRIPTION_PRIX_USD_MINUTE") ?? "0.002");
  const taux = Number(env.get("TAUX_USD_EUR") ?? "0.92");
  return {
    cle,
    modele: env.get("MISTRAL_TRANSCRIPTION_MODEL") || "voxtral-mini-latest",
    prixUsdMinute: Number.isFinite(prix) ? prix : 0.002,
    tauxUsdEur: Number.isFinite(taux) ? taux : 0.92,
  };
}

/** POST /v1/audio/transcriptions (multipart : model, file, language). */
export class TranscripteurMistral implements Transcripteur {
  readonly nom = "mistral-voxtral";
  constructor(private readonly cfg: ConfigTranscription, private readonly fetchFn: typeof fetch = fetch) {}

  async transcrire(octets: Uint8Array, mime: string, nom: string): Promise<Transcription> {
    const form = new FormData();
    form.append("model", this.cfg.modele);
    form.append("language", "fr");
    form.append("file", new Blob([octets as BlobPart], { type: mime || "audio/ogg" }), nom || "vocal.ogg");
    let rep: Response;
    try {
      rep = await this.fetchFn("https://api.mistral.ai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.cfg.cle}` },
        body: form,
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `transcription injoignable : ${(e as Error).message}`);
    }
    const texte = await rep.text();
    if (!rep.ok) {
      const reprendre = rep.status >= 500 || rep.status === 429;
      throw new ErreurOuvrier(reprendre ? "FOURNISSEUR_INDISPONIBLE" : "ERREUR_INTERNE", `transcription : HTTP ${rep.status} ${texte.slice(0, 300)}`, reprendre);
    }
    let corps: { text?: unknown; language?: unknown; usage?: { prompt_audio_seconds?: unknown }; segments?: { end?: unknown }[] };
    try {
      corps = JSON.parse(texte);
    } catch {
      throw new ErreurOuvrier("ERREUR_INTERNE", "transcription : réponse illisible", true);
    }
    const duree = Number(corps.usage?.prompt_audio_seconds ?? corps.segments?.at(-1)?.end ?? NaN);
    const duree_s = Number.isFinite(duree) && duree > 0 ? Math.round(duree) : undefined;
    const minutes = duree_s !== undefined ? duree_s / 60 : 1;
    return {
      texte: typeof corps.text === "string" ? corps.text.trim() : "",
      langue: typeof corps.language === "string" ? corps.language : undefined,
      duree_s,
      cout_eur: Math.round(minutes * this.cfg.prixUsdMinute * this.cfg.tauxUsdEur * 1_000_000) / 1_000_000,
    };
  }
}
