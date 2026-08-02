"use client";

/* Barre CTA mobile du pré-audit (pattern « sticky bottom bar » 21st.dev) :
   le document est ouvert depuis WhatsApp sur téléphone — le geste suivant
   doit rester sous le pouce. Apparaît passé le hero, masquée dès md
   (le CTA de section suffit au desktop). Vit HORS de .resa (clip-path). */

import { useEffect, useState } from "react";

export default function BarreCTA({
  entreprise,
  lien,
}: {
  entreprise: string;
  lien: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pa-cta-bar" data-visible={visible}>
      <span className="min-w-0 truncate text-[13px] leading-[18px] text-white/70">
        Pré-audit — {entreprise}
      </span>
      <a href={lien} className="pa-cta-bar-btn">
        Caler l&apos;entretien
      </a>
    </div>
  );
}
