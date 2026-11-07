/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la réponse à un mail reçu, écrite d'avance (07/11/2026, demande
   de Teo : « il doit juste avoir un truc genre valider l'envoi ou modifier ;
   pas que pour les devis, pour tous les trucs »)

   L'encart ./ReponsePrete.tsx demande ici la réponse d'un mail à
   /api/daliro/reponse-mail (Claude, la harness du moteur Daliro). Ce
   module garde les réponses déjà écrites dans ce navigateur (localStorage),
   une par mail, avec l'empreinte du mail au moment où elle a été écrite :
   si le mail change (modifié, une réponse ajoutée), on la refait. « Remettre
   les mails d'exemple » les efface (oublierReponses).
   ══════════════════════════════════════════════════════════════════════ */

import type { Mail } from "./exemplesMails";

export type ReponsePrete = {
  /* Daliro juge qu'il y a une réponse à envoyer ; sinon pourquoi le dit */
  repondre: boolean;
  pourquoi: string;
  objet: string;
  corps: string;
  a_verifier: string[];
  /* quand elle a été écrite, et pour quel état du mail */
  quand: string;
  empreinte: string;
  /* la consigne donnée pour la refaire, s'il y en a eu une */
  consigne: string;
  /* la personne l'a retouchée à la main */
  retouchee: boolean;
};

const CLE = "daliro-mails-reponses-v1";

export const empreinteDe = (m: Mail) => [m.de_adresse, m.objet, m.corps, m.categorie, String(m.reponses.length), m.chantier_id ?? ""].join("\u0001");

function lireTout(): Record<string, ReponsePrete> {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return {};
    const v = JSON.parse(brut) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, ReponsePrete>) : {};
  } catch {
    return {};
  }
}
function ecrireTout(tout: Record<string, ReponsePrete>) {
  try {
    localStorage.setItem(CLE, JSON.stringify(tout));
  } catch {
    /* navigation privée stricte : la réponse vit le temps de la page */
  }
}

/* la réponse gardée pour ce mail, si elle vaut encore pour lui */
export function lireReponse(m: Mail): ReponsePrete | null {
  const r = lireTout()[m.id];
  return r && typeof r.corps === "string" && r.empreinte === empreinteDe(m) ? r : null;
}
export function poserReponse(id: string, r: ReponsePrete) {
  const tout = lireTout();
  tout[id] = r;
  ecrireTout(tout);
}
export function oublierReponse(id: string) {
  const tout = lireTout();
  if (!(id in tout)) return;
  delete tout[id];
  ecrireTout(tout);
}
export function oublierReponses() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à oublier */
  }
}

type Brute = { repondre: boolean; pourquoi: string; objet: string; corps: string; a_verifier: string[] };

/* demande la réponse à Daliro ; lève une Error lisible si ça ne vient pas */
export async function demanderReponse(m: Mail, chantier: string | null, consigne = "", signal?: AbortSignal): Promise<ReponsePrete> {
  const r = await fetch("/api/daliro/reponse-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      mail: {
        de_nom: m.de_nom,
        de_adresse: m.de_adresse,
        objet: m.objet,
        corps: m.corps,
        categorie: m.categorie,
        priorite: m.priorite,
        recu_le: m.recu_le,
        pieces: m.pieces.map((p) => p.nom),
        reponses: m.reponses.map((x) => x.texte),
      },
      chantier,
      consigne,
    }),
  });
  const corps = (await r.json().catch(() => null)) as (Partial<Brute> & { erreur?: string }) | null;
  if (!r.ok || !corps || typeof corps.corps !== "string") throw new Error(corps?.erreur ?? "Daliro n'a pas pu écrire la réponse. Réessayez.");
  return {
    repondre: corps.repondre !== false,
    pourquoi: typeof corps.pourquoi === "string" ? corps.pourquoi : "",
    objet: typeof corps.objet === "string" ? corps.objet : `Re: ${m.objet}`,
    corps: corps.corps,
    a_verifier: Array.isArray(corps.a_verifier) ? corps.a_verifier.filter((x): x is string => typeof x === "string") : [],
    quand: new Date().toISOString(),
    empreinte: empreinteDe(m),
    consigne,
    retouchee: false,
  };
}
