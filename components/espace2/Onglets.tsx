"use client";

/* Les onglets soulignés de la barre du haut. Deux mouvements, comme sur
   la référence : un surlignage gris arrondi qui suit la souris d'onglet
   en onglet (0,15 s), et le trait de l'onglet actif qui glisse vers le
   nouvel onglet à la navigation (0,2 s). Ce sont des liens de page :
   aria-current="page" sur l'actif, Tab pour passer de l'un à l'autre. */

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Onglet } from "./modules";

type Rect = { x: number; l: number };

export default function Onglets({ onglets, actif, etiquette }: { onglets: Onglet[]; actif: string | null; etiquette: string }) {
  const nav = useRef<HTMLElement>(null);
  const liens = useRef(new Map<string, HTMLAnchorElement>());
  const [trait, setTrait] = useState<(Rect & { saut: boolean }) | null>(null);
  const [survol, setSurvol] = useState<(Rect & { saut: boolean }) | null>(null);

  useLayoutEffect(() => {
    const mesurer = (saut: boolean) => {
      const el = actif ? liens.current.get(actif) : null;
      setTrait((avant) => (el ? { x: el.offsetLeft + 12, l: el.offsetWidth - 24, saut: saut || !avant } : null));
    };
    mesurer(false);
    const ro = new ResizeObserver(() => mesurer(true));
    if (nav.current) ro.observe(nav.current);
    /* sur un écran étroit, la rangée défile : l'onglet actif y est ramené
       (sans scrollIntoView, qui déplacerait aussi le point de départ de Tab) */
    const el = actif ? liens.current.get(actif) : null;
    const n = nav.current;
    if (el && n) {
      if (el.offsetLeft < n.scrollLeft) n.scrollLeft = el.offsetLeft - 12;
      else if (el.offsetLeft + el.offsetWidth > n.scrollLeft + n.clientWidth) n.scrollLeft = el.offsetLeft + el.offsetWidth - n.clientWidth + 12;
    }
    return () => ro.disconnect();
  }, [actif]);

  const entrer = (href: string) => {
    const el = liens.current.get(href);
    if (!el) return;
    setSurvol((avant) => ({ x: el.offsetLeft, l: el.offsetWidth, saut: !avant }));
  };

  return (
    <nav ref={nav} className="v2-onglets" aria-label={etiquette} onMouseLeave={() => setSurvol(null)}>
      <span
        className="v2-onglets-survol"
        aria-hidden="true"
        data-visible={survol ? "" : undefined}
        data-saut={survol?.saut ? "" : undefined}
        style={survol ? { transform: `translateX(${survol.x}px)`, width: survol.l } : undefined}
      />
      {onglets.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          ref={(el) => {
            if (el) liens.current.set(o.href, el);
            else liens.current.delete(o.href);
          }}
          className="v2-onglet"
          aria-current={o.href === actif ? "page" : undefined}
          onMouseEnter={() => entrer(o.href)}
        >
          {o.libelle}
        </Link>
      ))}
      {trait ? (
        <span
          className="v2-onglets-trait"
          aria-hidden="true"
          data-saut={trait.saut ? "" : undefined}
          style={{ transform: `translateX(${trait.x}px)`, width: trait.l, left: 0 }}
        />
      ) : null}
    </nav>
  );
}
