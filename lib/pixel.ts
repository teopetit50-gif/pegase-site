/* ══════════════════════════════════════════════════════════════════════
   LE PIXEL META ET LE CONSENTEMENT — 21/09/2026

   Première pub en ligne d'Omega (plans-et-decisions/strategie-acquisition-
   2026-09-21.md, couche 3). Le pixel ne se charge QUE si :
     · NEXT_PUBLIC_META_PIXEL_ID est renseignée (variable Vercel, pas dans
       l'arbre) — sans elle, ni bandeau ni script : le site reste tel quel ;
     · le visiteur a accepté dans le bandeau (components/pub/Consentement).
   Le refus est la valeur par défaut : tant qu'aucun choix n'est fait, rien
   ne part. Le choix vit dans localStorage, par navigateur.

   Vercel Analytics (layout.tsx) est sans cookie et reste hors de ce
   mécanisme.
   ══════════════════════════════════════════════════════════════════════ */

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export const CLE_CONSENTEMENT = "omega-consentement";
export const EVT_CONSENTEMENT = "omega:consentement";

export type Choix = "oui" | "non";

export function lireConsentement(): Choix | null {
  try {
    const v = window.localStorage.getItem(CLE_CONSENTEMENT);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
}

export function ecrireConsentement(choix: Choix) {
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, choix);
  } catch {
    /* navigation privée, stockage bloqué : le bandeau reviendra, rien ne part */
  }
  window.dispatchEvent(new CustomEvent(EVT_CONSENTEMENT, { detail: choix }));
}

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Un événement standard Meta (PageView, Schedule, Lead…). Sans pixel
 *  chargé, c'est un no-op : le code appelant n'a rien à vérifier. */
export function suivrePixel(evenement: string, donnees?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", evenement, donnees);
  } catch {
    /* le pixel ne doit jamais faire échouer un geste du site */
  }
}

/** La file d'attente du pixel, équivalent du snippet officiel sans
 *  `unsafe-eval` ni script inline : fbq existe tout de suite, le script
 *  distant vide la file quand il arrive. */
export function chargerPixel() {
  if (!PIXEL_ID || typeof window === "undefined") return;
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else (fbq.queue ??= []).push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
}
