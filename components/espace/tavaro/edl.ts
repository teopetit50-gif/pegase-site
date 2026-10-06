/* ══════════════════════════════════════════════════════════════════════
   L'état des lieux contradictoire — ce que l'écran partage (06/10/2026, B2)

   Les zones et les vues (celles de private.loc_zones_dommage et de
   loc_signer_etat), et l'application des états au chiffrage, rejouée en
   mémoire pour l'exemple exactement comme private.loc_appliquer_etats :
   le carburant du départ signé fait foi, un retour non signé est non
   contradictoire, un dommage dans une zone déjà notée au départ signé
   n'est pas facturé.
   ══════════════════════════════════════════════════════════════════════ */

import type { Avertissement, EtatDesLieux, Retour, ZoneDommage } from "./types";

export const ZONES: { cle: ZoneDommage; libelle: string }[] = [
  { cle: "avant", libelle: "Avant" },
  { cle: "arriere", libelle: "Arrière" },
  { cle: "flanc_gauche", libelle: "Flanc gauche" },
  { cle: "flanc_droit", libelle: "Flanc droit" },
  { cle: "toit", libelle: "Toit" },
  { cle: "pare_brise", libelle: "Pare-brise" },
  { cle: "vitres", libelle: "Vitres" },
  { cle: "jantes", libelle: "Jantes" },
  { cle: "interieur", libelle: "Intérieur" },
  { cle: "coffre", libelle: "Coffre" },
];
export const libelleZone = (z: string | undefined | null) => ZONES.find((x) => x.cle === z)?.libelle ?? (z ?? "");

/* les quatre vues exigées pour signer, puis celles qui aident */
export const VUES_OBLIGATOIRES = [
  { cle: "avant", libelle: "Avant" },
  { cle: "arriere", libelle: "Arrière" },
  { cle: "flanc_gauche", libelle: "Flanc gauche" },
  { cle: "flanc_droit", libelle: "Flanc droit" },
] as const;
export const VUES_UTILES = [
  { cle: "compteur", libelle: "Compteur" },
  { cle: "jauge", libelle: "Jauge" },
  { cle: "interieur", libelle: "Intérieur" },
] as const;

export const MODES_CAUTION = [
  { cle: "empreinte_carte", libelle: "Empreinte de carte" },
  { cle: "cheque", libelle: "Chèque" },
  { cle: "especes", libelle: "Espèces" },
  { cle: "virement", libelle: "Virement" },
  { cle: "aucune", libelle: "Pas de caution" },
] as const;

export const etatDe = (etats: EtatDesLieux[], moment: "depart" | "retour") => etats.find((e) => e.moment === moment) ?? null;

export function appliquerEtats(retour: Retour, etats: EtatDesLieux[]): { retour: Retour; avertissements: Avertissement[] } {
  const dep = etatDe(etats, "depart");
  const ret = etatDe(etats, "retour");
  const av: Avertissement[] = [];
  let r: Retour = { ...retour };
  if (dep?.statut === "signe" && dep.carburant_8 !== null) {
    if (r.carburant_depart_8 !== dep.carburant_8) av.push({ poste: "carburant", code: "carburant_depart_signe", bloquant: false, detail: `Le carburant au départ est celui de l'état des lieux signé : ${dep.carburant_8}/8.` });
    r.carburant_depart_8 = dep.carburant_8;
  }
  if (ret?.statut === "signe") r.non_contradictoire = false;
  if (ret?.statut === "refuse") {
    r.non_contradictoire = true;
    av.push({ poste: "dommages", code: "retour_non_signe", bloquant: false, detail: `L'état des lieux de retour n'est pas signé : ${ret.refus_motif ?? ""}` });
  }
  if (dep?.statut === "signe") {
    const garde = r.dommages.filter((d) => {
      const deja = d.zone && dep.dommages.some((x) => x.zone === d.zone && (!x.code || !d.code || x.code === d.code.toUpperCase()));
      if (deja) av.push({ poste: d.code || "dommage", code: "deja_au_depart", bloquant: false, detail: `Zone « ${libelleZone(d.zone).toLowerCase()} » déjà notée sur l'état de départ signé : pas facturée.` });
      return !deja;
    });
    r = { ...r, dommages: garde };
  }
  return { retour: r, avertissements: av };
}

/* l'empreinte d'un état signé, en mémoire (exemple) : SHA-256 du contenu, comme la base */
export async function empreinte(contenu: unknown): Promise<string> {
  const octets = new TextEncoder().encode(JSON.stringify(contenu));
  const h = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
