/* Charnière entre les deux mondes (charte v2.2) : casquette crème à coins
   arrondis sur fond noir — le monde clair est une carte posée sur le noir,
   façon Qonto. Plus aucun dégradé (gris sales interdits). */
export default function Fondu({ vers }: { vers: "clair" | "sombre" }) {
  return <div aria-hidden className={vers === "clair" ? "fondu-clair" : "fondu-sombre"} />;
}
