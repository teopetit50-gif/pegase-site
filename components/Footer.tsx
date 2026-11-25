import PiedSite from "./charte/PiedSite";

/* ══════════════════════════════════════════════════════════════════════
   LE PIED DE LA VITRINE

   25/11/2026 (Teo, « que les autres pages soient semblables à l'accueil »,
   docs/charte-accueil.md, décision 3) : le pied blanc d'une ligne (copyright
   + cinq liens, 08/09) laisse la place au pied sombre de l'accueil, à quatre
   colonnes, sans le mot géant. Ses liens couvrent ceux de l'ancien pied :
   Nos offres (Logiciel), Intégrations, Service client, Où vont vos données,
   Mentions légales (une obligation, pas une décoration).
   L'ancien pied est dans l'historique git (commit 9e9ebda5 et avant).
   ══════════════════════════════════════════════════════════════════════ */
export default function Footer() {
  return <PiedSite />;
}
