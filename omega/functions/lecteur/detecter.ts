// Reconnaître la famille d'un fichier à ses premiers octets, puis au MIME
// déclaré et au nom : les clients envoient ce qu'ils ont sous la main.

export type Famille = "pdf" | "xml" | "image" | "tableur" | "texte" | "inconnu";
export type FormatImage = "png" | "jpeg" | "gif" | "webp";

export interface Detection {
  famille: Famille;
  formatImage?: FormatImage;
  /** Pour un tableur : csv ou xlsx. */
  formatTableur?: "csv" | "xlsx";
}

function commencePar(o: Uint8Array, motif: number[], decalage = 0): boolean {
  if (o.length < decalage + motif.length) return false;
  return motif.every((b, i) => o[decalage + i] === b);
}

export function detecter(octets: Uint8Array, mime: string, nom: string): Detection {
  const ext = (nom.split(".").pop() ?? "").toLowerCase();
  const m = (mime ?? "").toLowerCase();

  if (commencePar(octets, [0x25, 0x50, 0x44, 0x46])) return { famille: "pdf" }; // %PDF
  if (commencePar(octets, [0x89, 0x50, 0x4e, 0x47])) return { famille: "image", formatImage: "png" };
  if (commencePar(octets, [0xff, 0xd8, 0xff])) return { famille: "image", formatImage: "jpeg" };
  if (commencePar(octets, [0x47, 0x49, 0x46, 0x38])) return { famille: "image", formatImage: "gif" };
  if (commencePar(octets, [0x52, 0x49, 0x46, 0x46]) && commencePar(octets, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { famille: "image", formatImage: "webp" };
  }
  if (commencePar(octets, [0x50, 0x4b, 0x03, 0x04])) {
    // Une archive zip : un classeur Office, ou autre chose.
    if (ext === "xlsx" || ext === "xlsm" || m.includes("spreadsheet")) return { famille: "tableur", formatTableur: "xlsx" };
    return { famille: "inconnu" };
  }

  const debut = new TextDecoder("utf-8", { fatal: false }).decode(octets.subarray(0, 512)).replace(/^﻿/, "").trimStart();
  if (debut.startsWith("<?xml") || /^<[A-Za-z:]/.test(debut)) {
    if (ext === "xml" || m.includes("xml") || /CrossIndustryInvoice|<Invoice|<CreditNote|urn:oasis/.test(debut)) return { famille: "xml" };
    return { famille: "texte" };
  }
  if (ext === "csv" || m === "text/csv" || ext === "tsv") return { famille: "tableur", formatTableur: "csv" };
  if (m.startsWith("text/") || ext === "txt") return { famille: "texte" };
  return { famille: "inconnu" };
}
