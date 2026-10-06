/* ══════════════════════════════════════════════════════════════════════
   <EnPreparation> — la mention discrète d'une promesse pas encore livrée
   (06/10/2026, C5, omega/AUDIT-PROMESSES.md § 3, point 13)

   Règle de Teo : « livrer tout ce qu'on promet, pas une chose de moins ».
   Aucune ligne n'est retirée du site ; celle dont le code n'existe pas
   encore porte cette pastille, que l'on retire quand l'ouvrier livre.
   Le relevé ligne par ligne, avec l'ouvrier qui la rendra vraie, est dans
   omega/NOTES-C5.md.

   Style en ligne, pas en utilitaires : la pastille se pose sur des pages
   à peau scopée (.offres, .vd, capacites.css…) où une règle de page bat un
   utilitaire. Elle hérite de la couleur du texte (`currentColor`), donc
   elle se lit sur fond clair comme sur fond sombre sans variante.
   Composant serveur : utilisable partout, y compris dans un client.

   `libelle="Sur demande"` : la variante des intégrations (lib/integrations.ts)
   qui ne sont raccordées qu'à la demande d'un client ; point gris, pas ambre.
   ══════════════════════════════════════════════════════════════════════ */

import type { CSSProperties } from "react";

import { enPreparation, type ModulePromesses } from "@/lib/en-preparation";

const STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35em",
  verticalAlign: "0.12em",
  marginLeft: "0.5em",
  padding: "0.1em 0.55em",
  border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
  borderRadius: "999px",
  fontSize: "10.5px",
  fontWeight: 500,
  lineHeight: 1.5,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  opacity: 0.72,
};

const POINT: CSSProperties = {
  width: "5px",
  height: "5px",
  borderRadius: "999px",
  background: "#d4a017",
  flex: "0 0 auto",
};

export function EnPreparation({
  libelle = "En préparation",
  style,
}: {
  libelle?: "En préparation" | "Sur demande";
  style?: CSSProperties;
}) {
  const point = libelle === "Sur demande" ? { ...POINT, background: "currentColor", opacity: 0.45 } : POINT;
  return (
    <span style={{ ...STYLE, ...style }}>
      <span aria-hidden="true" style={point} />
      {libelle}
    </span>
  );
}

/* La pastille, seulement si le texte figure dans lib/en-preparation.ts. */
export function SiEnPreparation({
  pour,
  t,
  style,
}: {
  pour: ModulePromesses;
  t: string;
  style?: CSSProperties;
}) {
  return enPreparation(pour, t) ? <EnPreparation style={style} /> : null;
}
