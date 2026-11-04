/* ══════════════════════════════════════════════════════════════════════
   Daliro (BTP) — Bande.tsx

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/sections/bande.tsx`.
   Ce fichier-là est GÉNÉRÉ côté source par `outils/assembler.py` depuis `outils/textes.py` ; ici il ne
   l'est plus : c'est une copie du résultat, corrigée à la main. Un relevé à reprendre se refait en
   recopiant la nouvelle sortie de l'assembleur, puis en repassant les conversions ci-dessous.

   La bande hachurée à croix d'angle posée entre chaque section.

   Couleurs converties (règle 3) : border-border → border-[#e6e6e6] · bg-foreground/25 des croix →
   bg-[#171717]/25. Son `dark:[background-image:…]` (hachure blanche) est retiré.
   ══════════════════════════════════════════════════════════════════════ */
import React from "react";

export function Bande() {
  return (
    <>
{/* 24/09 (soir) : pleine largeur, sans les quatre croix d'angle — elles marquaient la jonction avec les filets
    verticaux du cadre, retirés (voir app/secteurs/btp/page.tsx). */}
<div aria-hidden="true" className="relative h-10 border-[#e6e6e6] border-y border-dashed bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,rgba(0,0,0,0.05)_0_1px,transparent_0_50%)] md:h-12" />
    </>
  );
}
