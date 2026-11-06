/* ══════════════════════════════════════════════════════════════════════
   DALIRO — le mail d'un devis, prêt à partir (06/11/2026, demande de Teo :
   « une petite colonne pour renvoyer à la page mail, avec un mail prérempli
   avec le devis ; il n'y a plus qu'à mettre l'adresse du mec »)

   Le devis (./FicheDevis, encart ./EnvoyerDevis) écrit ici le mail tout
   prêt : objet, message, la pièce jointe et le devis lui-même pour la
   feuille de gauche. La page Mails (./Mails, ?ecrire=devis) le relit et
   ouvre la carte « Nouveau mail » : il ne manque que l'adresse du client.
   Le brouillon passe par sessionStorage : le devis dicté n'existe que le
   temps de la page, il n'a pas d'adresse à lui.
   ══════════════════════════════════════════════════════════════════════ */

import { montant } from "@/components/espace/format";
import { TVA_GUADELOUPE, totalHt, type Devis } from "./exemplesDevis";

export type MailDevis = {
  /* l'adresse du client, si on l'a tapée dans l'encart du devis */
  a?: string;
  numero: string;
  titre: string;
  client: string;
  adresse: string;
  objet: string;
  corps: string;
  piece: { nom: string; taille: number };
  lignes: [string, string][];
  ht: string;
  ttc: string;
};

const CLE = "daliro-mail-devis-v1";
const aPreciser = (x: string) => !x.trim() || /à préciser/i.test(x);

export function mailDuDevis(d: Devis): MailDevis {
  const ht = totalHt(d);
  const ttc = ht * (1 + TVA_GUADELOUPE);
  const client = aPreciser(d.client) ? "" : d.client.trim();
  const adresse = aPreciser(d.adresse) ? "" : d.adresse.trim();
  const titre = d.titre.trim().replace(/\.$/, "");
  const objet = `Devis ${d.numero} — ${titre}`;
  const corps = [
    client ? `Bonjour ${client},` : "Bonjour,",
    "",
    `Suite à notre passage${adresse ? ` à ${adresse}` : ""}, vous trouverez ci-joint notre devis ${d.numero} : ${titre.charAt(0).toLowerCase()}${titre.slice(1)}.`,
    "",
    `Montant : ${montant(ht)} HT, soit ${montant(ttc)} TTC (TVA 8,5 %).`,
    "",
    "Le devis est valable trois mois. Pour le valider, renvoyez-le signé avec la mention « Bon pour accord », ou répondez simplement à ce mail : nous fixerons ensemble la date de démarrage.",
    "",
    "Je reste à votre disposition pour toute question.",
    "",
    "Bien cordialement,",
    "L'équipe travaux",
  ].join("\n");
  return {
    numero: d.numero,
    titre,
    client: client || "Client",
    adresse,
    objet,
    corps,
    /* un PDF d'une page de devis pèse ~90 Ko, ~6 Ko de plus par ligne */
    piece: { nom: `Devis-${d.numero}.pdf`, taille: Math.round((90 + d.lignes.length * 6) * 1024) },
    lignes: d.lignes.map((l) => [`${l.designation} · ${l.quantite} ${l.unite}`, l.prix === null ? "à chiffrer" : montant(l.prix * l.quantite)]),
    ht: montant(ht),
    ttc: montant(ttc),
  };
}

export function poserMailDevis(m: MailDevis) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(m));
  } catch {
    /* navigation privée stricte : la page Mails ouvrira un mail vide */
  }
}

export function lireMailDevis(): MailDevis | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const v = JSON.parse(brut) as MailDevis;
    return v && typeof v.objet === "string" && typeof v.corps === "string" ? v : null;
  } catch {
    return null;
  }
}

export function oublierMailDevis() {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    /* rien à oublier */
  }
}

export const adresseValide = (x: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(x.trim());
