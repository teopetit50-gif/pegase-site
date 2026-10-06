// Le fichier de la preuve du découpage (omega/banc/decoupage_reel.mjs) : un PDF natif de trois pages, trois factures
// fictives de trois fournisseurs (une par page), comme un scan groupé envoyé par un client. Données inventées ;
// SIREN à clé de Luhn valide. deno run -A banc/trois_factures.ts → omega/banc/trois_factures.pdf
import { ecrirePdf, type LigneTexte } from "./pdf_minimal.ts";

const page = (t: string[]): { type: "texte"; lignes: LigneTexte[] } => ({ type: "texte", lignes: t.map((texte, i) => ({ x: 50, y: 60 + i * 20, texte })) });

export const FACTURES = [
  { numero: "BAN-2026-0101", fournisseur: "Papeterie Essai Nord SARL", siren: "552100554", ht: 100, tva: 20, ttc: 120 },
  { numero: "BAN-2026-0102", fournisseur: "Transports Essai Sud SAS", siren: "732829320", ht: 250, tva: 50, ttc: 300 },
  { numero: "BAN-2026-0103", fournisseur: "Nettoyage Essai Est EURL", siren: "542107651", ht: 80, tva: 16, ttc: 96 },
];

export function troisFactures(): Uint8Array {
  return ecrirePdf(FACTURES.map((f) =>
    page([
      `FACTURE N° ${f.numero}`,
      `${f.fournisseur} - SIREN ${f.siren}`,
      "Date de facture : 01/10/2026 - Échéance : 31/10/2026",
      "Client : Groupe Sogexal (banc d'essai Omega)",
      `Prestation d'essai pour la preuve du découpage .... ${f.ht.toFixed(2).replace(".", ",")} € HT`,
      `Total HT : ${f.ht.toFixed(2).replace(".", ",")} €`,
      `TVA 20 % : ${f.tva.toFixed(2).replace(".", ",")} €`,
      `Total TTC : ${f.ttc.toFixed(2).replace(".", ",")} €`,
      "Document fictif - banc d'essai Omega",
    ])
  ));
}

if (import.meta.main) {
  const sortie = new URL("../../../banc/trois_factures.pdf", import.meta.url);
  await Deno.writeFile(sortie, troisFactures());
  console.log(`écrit : ${sortie.pathname}`);
}
