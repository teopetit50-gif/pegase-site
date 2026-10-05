// OCR classique pour les pages sans texte : Mistral OCR (hébergé en Union
// européenne, 1 $ les 1 000 pages). Facultatif : sans MISTRAL_API_KEY, la
// lecture visuelle passe par Claude sur Bedrock. Voir NOTES-A1.md.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import { base64 } from "@partage/bedrock.ts";
import type { FormatImage } from "./detecter.ts";

export interface PageOcr {
  n: number;
  texte: string;
  largeur?: number;
  hauteur?: number;
}

export interface ResultatOcr {
  pages: PageOcr[];
  cout_eur: number;
  fournisseur: string;
}

export interface Ocr {
  readonly nom: string;
  reconnaitre(octets: Uint8Array, nature: "pdf" | "image", format?: FormatImage): Promise<ResultatOcr>;
}

export interface ConfigMistral {
  cle: string;
  modele: string;
  prixUsdPage: number;
  tauxUsdEur: number;
}

export function configMistralDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ConfigMistral | null {
  const cle = env.get("MISTRAL_API_KEY");
  if (!cle) return null;
  const prix = Number(env.get("MISTRAL_OCR_PRIX_USD_PAGE") ?? "0.001");
  const taux = Number(env.get("TAUX_USD_EUR") ?? "0.92");
  return {
    cle,
    modele: env.get("MISTRAL_OCR_MODEL") || "mistral-ocr-latest",
    prixUsdPage: Number.isFinite(prix) ? prix : 0.001,
    tauxUsdEur: Number.isFinite(taux) ? taux : 0.92,
  };
}

export class OcrMistral implements Ocr {
  readonly nom = "mistral-ocr";
  constructor(private readonly cfg: ConfigMistral, private readonly fetchFn: typeof fetch = fetch) {}

  async reconnaitre(octets: Uint8Array, nature: "pdf" | "image", format: FormatImage = "jpeg"): Promise<ResultatOcr> {
    const donnee = nature === "pdf"
      ? { type: "document_url", document_url: `data:application/pdf;base64,${base64(octets)}` }
      : { type: "image_url", image_url: `data:image/${format};base64,${base64(octets)}` };
    let rep: Response;
    try {
      rep = await this.fetchFn("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.cfg.cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.cfg.modele, document: donnee, include_image_base64: false }),
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `OCR injoignable : ${(e as Error).message}`);
    }
    const texte = await rep.text();
    if (!rep.ok) {
      if (rep.status === 429 || rep.status >= 500) throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `OCR HTTP ${rep.status} : ${texte.slice(0, 200)}`);
      throw new ErreurOuvrier("ERREUR_INTERNE", `OCR HTTP ${rep.status} : ${texte.slice(0, 200)}`);
    }
    const json = JSON.parse(texte) as {
      pages?: { index: number; markdown: string; dimensions?: { width?: number; height?: number } }[];
      usage_info?: { pages_processed?: number };
    };
    const pages = (json.pages ?? []).map((p, i) => ({
      n: (Number.isInteger(p.index) ? p.index : i) + 1,
      texte: (p.markdown ?? "").trim(),
      largeur: p.dimensions?.width,
      hauteur: p.dimensions?.height,
    }));
    const nb = json.usage_info?.pages_processed ?? pages.length;
    return { pages, cout_eur: Math.round(nb * this.cfg.prixUsdPage * this.cfg.tauxUsdEur * 1e6) / 1e6, fournisseur: this.nom };
  }
}
