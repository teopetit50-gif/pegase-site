import { ImageResponse } from "next/og";
import { SITE_BASELINE, SITE_NOM } from "@/lib/site";
import { MARQUE_SITE } from "@/components/espace2/portail";
import { secteur } from "@/lib/secteurs";

/* 10/11/2026 — sur un site dédié à un logiciel, l'image porte le nom et la ligne du logiciel (components/espace2/portail.ts) */
const NOM = MARQUE_SITE?.nom ?? SITE_NOM;
const LIGNE = (MARQUE_SITE && secteur(MARQUE_SITE.secteur)?.ligne) || SITE_BASELINE;

/* ══════════════════════════════════════════════════════════════════════
   Image Open Graph (30/07/2026)

   Un lien partagé sur WhatsApp — le canal principal de Omega depuis
   aujourd'hui — s'affichait sans vignette. Cette image est celle que
   verront WhatsApp, LinkedIn, Facebook et l'aperçu iMessage.

   Elle reprend le monde nuit de la home : fond #09090b, halo circulaire
   très faible, titre en graisse 600. Pas de police embarquée : le runtime
   Edge n'a pas accès au disque, et charger Plus Jakarta Sans demanderait
   un fetch réseau à chaque génération. La sans-serif système est proche
   et l'image est mise en cache.
   ══════════════════════════════════════════════════════════════════════ */

export const alt = `${NOM} : ${LIGNE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* le halo de la home, en plus resserré pour tenir dans 1200×630 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "62%",
            width: 1100,
            height: 1100,
            marginLeft: -550,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 68%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            {NOM}
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              fontSize: 16,
              color: "#ffffff",
              letterSpacing: "0.04em",
            }}
          >
            {MARQUE_SITE ? (secteur(MARQUE_SITE.secteur)?.metier ?? "LOGICIEL").toUpperCase() : "AUTOMATISATION"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              maxWidth: 940,
            }}
          >
            {MARQUE_SITE ? LIGNE : "Ce qui se répète n'a plus à passer par vous."}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 26,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.62)",
              maxWidth: 820,
            }}
          >
            {MARQUE_SITE
              ? (secteur(MARQUE_SITE.secteur)?.texte ?? "")
              : "Douze moteurs d'automatisation installés sur les outils que vous avez déjà : relance d'impayés, réponses clients, factures fournisseurs."}
          </div>
        </div>
      </div>
    ),
    size
  );
}
