// Le SIREN de l'acheteur d'une facture reçue : c'est par lui que pa_noter_flux (a4_18) retrouve le
// client Omega (clé `acheteur_siren` de p_detail). Lecture tolérante, sans validation :
//   CII (et Factur-X, qui embarque un CII) : bloc BuyerTradeParty ;
//   UBL : bloc AccountingCustomerParty.
// Dans le bloc, identifiants à schemeID 0002 (SIREN), puis 0009 (SIRET → 9 premiers chiffres),
// puis 0225 (adresse de routage française, qui commence par le SIREN).
// Factur-X : le XML est un fichier joint au PDF, le plus souvent compressé (FlateDecode) ;
// chaque flux du PDF est essayé, décompressé au besoin, jusqu'à trouver un BuyerTradeParty.

const ORDRE = ["0002", "0009", "0225"];

function sirenDuBloc(bloc: string): string | null {
  const trouves = new Map<string, string>();
  const re =
    /<(?:[\w-]+:)?(?:ID|GlobalID|CompanyID|EndpointID|URIID)\b[^>]*schemeID="(\d{4})"[^>]*>\s*([^<]+?)\s*</g;
  for (const m of bloc.matchAll(re)) {
    const chiffres = m[2].replace(/\D/g, "");
    if (chiffres.length >= 9 && !trouves.has(m[1])) {
      trouves.set(m[1], chiffres.slice(0, 9));
    }
  }
  for (const s of ORDRE) if (trouves.has(s)) return trouves.get(s)!;
  return null;
}

/** Depuis le texte XML d'une facture CII ou UBL. */
export function sirenAcheteurXml(xml: string): string | null {
  const cii = xml.match(
    /<(?:[\w-]+:)?BuyerTradeParty\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?BuyerTradeParty>/,
  );
  if (cii) return sirenDuBloc(cii[1]);
  const ubl = xml.match(
    /<(?:[\w-]+:)?AccountingCustomerParty\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?AccountingCustomerParty>/,
  );
  if (ubl) return sirenDuBloc(ubl[1]);
  return null;
}

async function inflater(
  octets: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array | null> {
  try {
    const flux = new Blob([octets]).stream().pipeThrough(
      new DecompressionStream("deflate"),
    );
    return new Uint8Array(await new Response(flux).arrayBuffer());
  } catch {
    return null;
  }
}

/** Le XML CII embarqué dans un PDF Factur-X, compressé ou non. */
export async function xmlDuPdf(
  pdf: Uint8Array<ArrayBuffer>,
): Promise<string | null> {
  const latin = new TextDecoder("latin1").decode(pdf);
  const direct = latin.indexOf("CrossIndustryInvoice");
  if (direct >= 0 && latin.includes("BuyerTradeParty")) {
    // Fichier joint non compressé : le texte est lisible tel quel (UTF-8 relu ci-dessous).
    return new TextDecoder().decode(pdf);
  }
  const re = /(?<!end)stream\r?\n/g;
  let m: RegExpExecArray | null;
  let essais = 0;
  while ((m = re.exec(latin)) && essais < 200) {
    const debut = m.index + m[0].length;
    const fin = latin.indexOf("endstream", debut);
    if (fin < 0) break;
    essais++;
    // La fin de ligne avant « endstream » ne fait pas partie des données compressées.
    let bout = fin;
    while (bout > debut && (pdf[bout - 1] === 0x0a || pdf[bout - 1] === 0x0d)) {
      bout--;
    }
    // Sans /Length lu, on essaie sans puis avec la fin de ligne (elle peut être une donnée).
    const clair = await inflater(pdf.slice(debut, bout)) ??
      (bout < fin ? await inflater(pdf.slice(debut, fin)) : null);
    if (clair) {
      const texte = new TextDecoder().decode(clair);
      if (texte.includes("BuyerTradeParty")) return texte;
    }
    re.lastIndex = fin + "endstream".length;
  }
  return null;
}

/** SIREN de l'acheteur, ou null s'il n'est pas lisible : la porte classe alors le flux « orphelin ». */
export async function sirenAcheteur(
  octets: Uint8Array<ArrayBuffer>,
  syntaxe: string,
  typeMime: string,
): Promise<string | null> {
  const estPdf = syntaxe === "Factur-X" || typeMime === "application/pdf" ||
    new TextDecoder("latin1").decode(octets.slice(0, 5)) === "%PDF-";
  if (estPdf) {
    const xml = await xmlDuPdf(octets);
    return xml ? sirenAcheteurXml(xml) : null;
  }
  return sirenAcheteurXml(new TextDecoder().decode(octets));
}
