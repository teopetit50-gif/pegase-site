/* ══════════════════════════════════════════════════════════════════════
   La facture d'honoraires imprimable (06/10/2026, session B4, b4_06 et
   b4_09)

   Composée DANS LE NAVIGATEUR : le nom du client et le détail du temps
   sont chiffrés en base, ils ne se lisent qu'ici. Le HTML rendu est une
   page autonome (styles en ligne), montrée dans un aperçu puis imprimée
   (ou enregistrée en PDF par le navigateur). Rien ne part au serveur.

   Mentions : CGI art. 242 nonies A et C. com. L.441-9 (identité, SIREN,
   TVA, numéro, date, désignation, HT, TVA, TTC, échéance, pénalités de
   retard et indemnité forfaitaire de 40 € pour un professionnel,
   L.441-10 et D.441-5) ; RIN art. 11.7 pour le compte détaillé définitif
   (frais et déboursés, honoraires, provisions reçues, distincts).
   ══════════════════════════════════════════════════════════════════════ */

import type { Convention, EnteteFacture, Facture, NatureTemps, Temps } from "./types";

const NATURES: Record<NatureTemps, string> = {
  consultation: "Consultation", redaction: "Rédaction", recherche: "Recherche", audience: "Audience", rendez_vous: "Rendez-vous",
  correspondance: "Correspondance", deplacement: "Déplacement", negociation: "Négociation", autre: "Autre",
};

export const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const date = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "");
const duree = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;

export function echapper(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** La date d'échéance : l'émission plus le délai de paiement de l'en-tête (30 jours par défaut). */
export function echeance(emise: string, jours: number | undefined): string {
  const d = new Date(`${emise.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (jours ?? 30));
  return d.toISOString().slice(0, 10);
}

/**
 * Le montant HT de chaque ligne de temps, en centimes, tel que leur somme soit EXACTEMENT le total facturé
 * (calculé par la base sur le total des minutes) : arrondi par défaut, puis les centimes restants aux plus fortes
 * parties décimales.
 */
export function repartir(minutes: number[], tauxCents: number, totalCents: number): number[] {
  const exacts = minutes.map((m) => (m * tauxCents) / 60);
  const bas = exacts.map(Math.floor);
  let reste = totalCents - bas.reduce((s, x) => s + x, 0);
  const ordre = exacts.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f);
  for (let k = 0; reste > 0 && ordre.length; k = (k + 1) % ordre.length, reste--) bas[ordre[k].i] += 1;
  for (let k = ordre.length - 1; reste < 0 && ordre.length; k = (k - 1 + ordre.length) % ordre.length, reste++) bas[ordre[k].i] -= 1;
  return bas;
}

export type DonneesFacture = {
  facture: Facture;
  convention: Convention | null;
  /* les temps portés par la facture, et leur description déchiffrée */
  temps: Temps[];
  descriptions: Record<string, string>;
  entete: EnteteFacture;
  client: { nom: string; adresse: string };
  dossier: { reference: string; intitule: string };
};

export function htmlFacture(x: DonneesFacture): string {
  const { facture: f, convention: c, entete: e } = x;
  const definitif = f.nature === "compte_definitif";
  const lignes = [...x.temps].sort((a, b) => a.jour.localeCompare(b.jour));
  const montants = c?.taux_horaire_cents ? repartir(lignes.map((t) => t.minutes), c.taux_horaire_cents, f.honoraires_temps_cents) : lignes.map(() => 0);
  const ech = echeance(f.emise_le, e.delai_paiement_jours);
  const cabinet = [e.nom, e.forme].filter(Boolean).join(", ");
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top"';
  const tdr = 'style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;white-space:nowrap;vertical-align:top"';
  const tot = (libelle: string, montant: string, fort = false) =>
    `<tr><td style="padding:4px 8px;text-align:right${fort ? ";font-weight:700" : ""}">${echapper(libelle)}</td><td style="padding:4px 8px;text-align:right;white-space:nowrap${fort ? ";font-weight:700" : ""}">${montant}</td></tr>`;

  const lignesHtml = lignes.map((t, i) => `<tr>
      <td ${td}>${date(t.jour)}</td>
      <td ${td}>${echapper(NATURES[t.nature])}${x.descriptions[t.id] ? ` — ${echapper(x.descriptions[t.id])}` : ""}</td>
      <td ${tdr}>${duree(t.minutes)}</td>
      <td ${tdr}>${c?.taux_horaire_cents ? euros(c.taux_horaire_cents) : ""}</td>
      <td ${tdr}>${euros(montants[i])}</td>
    </tr>`).join("");
  const forfait = f.forfait_cents ? `<tr><td ${td}></td><td ${td}>Forfait convenu${c?.signee_le ? ` (convention du ${date(c.signee_le)})` : ""}</td><td ${tdr}></td><td ${tdr}></td><td ${tdr}>${euros(f.forfait_cents)}</td></tr>` : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(`${definitif ? "Compte détaillé définitif" : "Facture"} ${f.numero}`)}</title>
<style>@page{size:A4;margin:16mm}body{font-family:Georgia,"Times New Roman",serif;color:#111;font-size:12.5px;line-height:1.45;margin:0;padding:24px}
@media print{body{padding:0}}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%}.petit{font-size:11px;color:#444}</style></head><body>
<table style="margin-bottom:24px"><tr>
  <td style="vertical-align:top;width:55%">
    <div style="font-size:16px;font-weight:700">${echapper(cabinet || "Cabinet")}</div>
    <div>${echapper(e.adresse)}</div><div>${echapper(e.code_postal_ville)}</div>
    ${e.barreau ? `<div>Avocat${e.forme ? "s" : ""} au barreau de ${echapper(e.barreau)}${e.toque ? ` — toque ${echapper(e.toque)}` : ""}</div>` : ""}
    ${e.telephone || e.courriel ? `<div>${echapper([e.telephone, e.courriel].filter(Boolean).join(" · "))}</div>` : ""}
    <div class="petit">${e.siren ? `SIREN ${echapper(e.siren)}` : ""}${e.tva_intracom ? ` · TVA ${echapper(e.tva_intracom)}` : ""}</div>
  </td>
  <td style="vertical-align:top;text-align:right">
    <h1>${definitif ? "Compte détaillé définitif" : "Facture"}</h1>
    <div>N° <b>${echapper(f.numero)}</b></div>
    <div>Émise le ${date(f.emise_le)}</div>
    <div>Échéance le ${date(ech)}</div>
  </td></tr></table>
<table style="margin-bottom:20px"><tr>
  <td style="vertical-align:top;width:55%"><div class="petit">Dossier</div><div><b>${echapper(x.dossier.reference)}</b> — ${echapper(x.dossier.intitule)}</div>
    ${c?.signee_le ? `<div class="petit">Honoraires fixés par la convention signée le ${date(c.signee_le)}${c.mode === "temps_passe" ? ", au temps passé" : c.mode === "forfait" ? ", au forfait" : ", au forfait et au temps passé"}.</div>` : c?.urgence ? `<div class="petit">Intervention en urgence (loi du 31/12/1971, art. 10).</div>` : ""}</td>
  <td style="vertical-align:top;border:1px solid #ccc;padding:10px 12px"><div class="petit">Client</div><div><b>${echapper(x.client.nom)}</b></div><div style="white-space:pre-line">${echapper(x.client.adresse)}</div></td>
</tr></table>
<table><thead><tr style="text-align:left;border-bottom:2px solid #111">
  <th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Diligence</th><th style="padding:6px 8px;text-align:right">Durée</th><th style="padding:6px 8px;text-align:right">Taux HT</th><th style="padding:6px 8px;text-align:right">Montant HT</th>
</tr></thead><tbody>${lignesHtml}${forfait}${lignes.length || forfait ? "" : `<tr><td ${td} colspan="5">Aucune diligence facturée sur cette période.</td></tr>`}</tbody></table>
<table style="width:auto;margin:14px 0 0 auto;min-width:320px">
  ${tot(`Honoraires HT (${duree(f.minutes)})`, euros(f.total_ht_cents))}
  ${tot(`TVA ${f.taux_tva.toLocaleString("fr-FR")} %`, euros(f.tva_cents))}
  ${f.debours_cents ? tot("Frais et déboursés (hors TVA)", euros(f.debours_cents)) : ""}
  ${tot("Total TTC", euros(f.total_ttc_cents), true)}
  ${f.provisions_imputees_cents ? tot("Provisions reçues, déduites", `− ${euros(f.provisions_imputees_cents)}`) : ""}
  ${tot(f.reste_du_cents < 0 ? "Trop-perçu à restituer" : "Reste à payer", euros(Math.abs(f.reste_du_cents)), true)}
</table>
${f.taux_tva === 0 && e.mention_tva ? `<p class="petit">${echapper(e.mention_tva)}</p>` : ""}
${definitif ? `<p class="petit">Compte détaillé définitif établi conformément à l'article 11.7 du règlement intérieur national de la profession d'avocat : il fait ressortir distinctement les frais et déboursés, les honoraires et les provisions reçues.</p>` : ""}
<div style="margin-top:22px;padding-top:10px;border-top:1px solid #ccc" class="petit">
  ${e.iban ? `<div>Règlement par virement : IBAN ${echapper(e.iban)}${e.bic ? ` — BIC ${echapper(e.bic)}` : ""} — référence ${echapper(f.numero)}.</div>` : ""}
  <div>Paiement à ${e.delai_paiement_jours ?? 30} jours, le ${date(ech)} au plus tard. Pas d'escompte pour paiement anticipé.</div>
  <div>En cas de retard : pénalités au taux de la Banque centrale européenne majoré de dix points (C. com. art. L.441-10) et, pour un client professionnel, indemnité forfaitaire de 40 € pour frais de recouvrement (art. D.441-5).</div>
</div>
</body></html>`;
}
