// Le flux public des taux de référence de la BCE : unités de devise pour 1 €,
// publiés vers 16 h (heure de Francfort) chaque jour ouvré TARGET. Sans clé.
//   quotidien : https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
//   90 jours  : https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml
// Format : <Cube time='AAAA-MM-JJ'><Cube currency='USD' rate='1.1269'/>…</Cube> (guillemets simples ou doubles).

export const URL_QUOTIDIEN = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const URL_90_JOURS = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";
const DELAI_MS = 20_000;

export interface Taux {
  devise: string;
  /** AAAA-MM-JJ, jour de cotation. */
  jour: string;
  /** Unités de devise pour 1 €, tel que publié (texte décimal, pour ne rien perdre). */
  taux: string;
}

/** Lit le XML de la BCE ; rend les taux, jour par jour. Un fichier sans aucun jour lève une erreur. */
export function lireFluxBce(xml: string): Taux[] {
  const taux: Taux[] = [];
  const jours = /<Cube\s+time=["'](\d{4}-\d{2}-\d{2})["']\s*>([\s\S]*?)<\/Cube>/g;
  let j: RegExpExecArray | null;
  let n = 0;
  while ((j = jours.exec(xml)) !== null) {
    n++;
    const jour = j[1];
    const devises = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([0-9]+(?:\.[0-9]+)?)["']\s*\/>/g;
    let d: RegExpExecArray | null;
    while ((d = devises.exec(j[2])) !== null) {
      if (d[1] === "EUR" || Number(d[2]) <= 0) continue;
      taux.push({ devise: d[1], jour, taux: d[2] });
    }
  }
  if (n === 0) throw new Error("Flux BCE illisible : aucun jour de cotation.");
  return taux;
}

/** Le jour de cotation le plus récent d'un lot, ou null. */
export function dernierJour(taux: Taux[]): string | null {
  return taux.reduce<string | null>((m, t) => (m === null || t.jour > m ? t.jour : m), null);
}

export interface SourceBce {
  lire(url: string): Promise<Taux[]>;
}

export class SourceBceHttp implements SourceBce {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}
  async lire(url: string): Promise<Taux[]> {
    const rep = await this.fetchFn(url, { headers: { Accept: "application/xml" }, signal: AbortSignal.timeout(DELAI_MS) });
    const texte = await rep.text();
    if (!rep.ok) throw new Error(`BCE : HTTP ${rep.status}`);
    return lireFluxBce(texte);
  }
}
