"use client";

import { useEffect } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Dernier filet du site (25/09/2026)

   Audit sécurité du 25/09. Cette page ne s'affiche que si la mise en page
   RACINE elle-même tombe (app/layout.tsx) : app/error.tsx ne peut alors
   rien, puisqu'il vit à l'intérieur. Elle remplace tout le document : ni
   la feuille de style du site ni ses polices ne sont chargées (doc de
   cette version de Next : « global-error … do not include your global
   styles »). D'où le style en ligne, les polices du système, et un
   lien <a> simple plutôt que le routeur.
   ══════════════════════════════════════════════════════════════════════ */

/* le fond du site est noir (--panel: #000000, app/globals.css) */
const FOND = "#000000";
const ENCRE = "#ffffff";
const SOURDINE = "#a3a3a3";

export default function ErreurGlobale({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[site] erreur de la mise en page racine", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: FOND,
          color: ENCRE,
          fontFamily: "-apple-system, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
          padding: "0 24px",
        }}
      >
        <title>Omega — Incident</title>
        <main style={{ maxWidth: 480, textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: SOURDINE, margin: 0 }}>
            Omega
          </p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "16px 0 0" }}>
            Le site est momentanément indisponible.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: SOURDINE, margin: "16px 0 0" }}>
            L&apos;incident vient de chez nous. Réessayez dans un instant, ou écrivez-nous à
            contact@omegaai.fr.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                border: 0,
                borderRadius: 10,
                background: "#2e2e2e",
                color: "#ffffff",
                padding: "14px 25px",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            {/* Un <a> et non <Link> : la mise en page racine vient de tomber,
                un rechargement complet repart de zéro, la navigation interne
                réutiliserait l'état qui a planté. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.25)",
                color: ENCRE,
                padding: "14px 25px",
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: 40, fontSize: 12, color: SOURDINE, fontFamily: "ui-monospace, Consolas, monospace" }}>
              Référence : {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
