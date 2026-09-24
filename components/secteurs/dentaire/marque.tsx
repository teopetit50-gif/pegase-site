/* ══════════════════════════════════════════════════════════════════════
   Tiroma — la marque PROVISOIRE (24/09/2026)

   Tiroma n'a pas encore de logo officiel. On garde donc le monogramme que
   dessine la source (`C_Marque` de OMEGA/dentaire-site) : un carré arrondi
   à 28 %, dégradé vert d'eau (bleu ciel avant le rhabillage du 24/09), et
   un « T » semi-gras à 0,62 em. Dans la
   page, il reste là où la source le posait dans le CORPS : le nœud
   « Tiroma » du schéma de la section Écrans (Schema.tsx). Ceux de l'entête
   et du pied de la source partent avec eux.

   Les masques public/logos/tiroma-mark.png et tiroma-lockup.png (carte de
   /secteurs) sont tirés de ce même dessin ; eux aussi sont provisoires.
   Quand Teo fournira le logo, il remplace ce composant par le signe en
   masque, comme `SigneDaliro` (components/secteurs/btp/marque.tsx).
   ══════════════════════════════════════════════════════════════════════ */

export function MarqueTiroma({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-[28%] bg-gradient-to-br from-[#72b0a4] to-[#3b7a6e] font-semibold leading-none text-white ${className}`}
    >
      <span style={{ fontSize: "0.62em" }}>T</span>
    </span>
  );
}
