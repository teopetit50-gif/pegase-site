"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   <QuandVisible> — pose `data-vu` sur son bloc la première fois qu'il
   entre à l'écran (27/09/2026)

   Sert au bento de <GarantiesAudit> : ses mini-interfaces (reçu, jauge,
   agenda, notification) ne jouent leur animation que sous `[data-vu]`.
   Sans JavaScript, ou avant l'hydratation, rien n'est masqué : les
   animations partent de leur état initial SEULEMENT quand l'attribut
   arrive, et leur état final est l'état naturel du dessin.

   L'attribut est posé directement sur le nœud, sans état React : aucun
   rendu de plus, et rien à réconcilier (React ne gère pas cet attribut).
   ══════════════════════════════════════════════════════════════════════ */
export default function QuandVisible({
  children,
  seuil = 0.25,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { seuil?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute("data-vu", "");
          obs.disconnect();
        }
      },
      { threshold: seuil },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seuil]);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
