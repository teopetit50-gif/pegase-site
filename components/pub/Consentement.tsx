"use client";

/* Le bandeau de consentement — 21/09/2026.

   N'apparaît que si un pixel est configuré ET qu'aucun choix n'est encore
   enregistré. Deux boutons de même poids ; « Refuser » ne charge rien et
   ne redemande pas. Style dans pub.css, hors du monde .resa : le bandeau
   vit dans le layout, au-dessus de toutes les pages. */

import { useSyncExternalStore } from "react";
import { EVT_CONSENTEMENT, PIXEL_ID, ecrireConsentement, lireConsentement } from "@/lib/pixel";
import "./pub.css";

export default function Consentement() {
  /* Le choix est un état externe (localStorage + événement) : lu par
     useSyncExternalStore, rien à poser dans un effet. Côté serveur, "non" :
     le bandeau n'est jamais dans le HTML servi, il apparaît à l'hydratation
     si aucun choix n'est enregistré. */
  const choix = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT_CONSENTEMENT, cb);
      return () => window.removeEventListener(EVT_CONSENTEMENT, cb);
    },
    () => lireConsentement(),
    () => "non" as const,
  );

  if (!PIXEL_ID || choix !== null) return null;

  const choisir = (c: "oui" | "non") => ecrireConsentement(c);

  return (
    <div className="pub-consent" role="dialog" aria-live="polite" aria-label="Mesure d'audience">
      <p className="pub-consent-texte">
        Nous mesurons ce que nos annonces amènent sur ce site. Un témoin de mesure est
        posé seulement si vous l&apos;acceptez&nbsp;; rien d&apos;autre ne change.
      </p>
      <div className="pub-consent-actions">
        <button type="button" className="pub-consent-btn" onClick={() => choisir("non")}>
          Refuser
        </button>
        <button
          type="button"
          className="pub-consent-btn pub-consent-btn--noir"
          onClick={() => choisir("oui")}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
