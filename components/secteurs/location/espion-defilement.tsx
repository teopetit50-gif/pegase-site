"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro — espion-defilement.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   ui/scroll-spy.tsx` (hook `useScrollSpy` du composant 21st.dev
   @ddoemonn/scroll-spy). Même calcul, même verrou au clic, même annonce.

   Ce qui change — le lint de ce site (React Compiler) refusait trois
   écritures que la source laissait passer :
   · `list.current = sections` et `emit.current = onChange` étaient écrits
     PENDANT le rendu : ils le sont après, dans un effet sans dépendances
     (les lectures ont lieu dans des gestionnaires de défilement, toujours
     après la validation du rendu) ;
   · l'option `root` (défilement dans un conteneur) n'était jamais passée —
     Solutions.tsx espionne la fenêtre — et ses `root.current` lus dans des
     `useCallback` cassaient la mémoïsation : retirée, le hook ne suit que
     la fenêtre, ce qu'il faisait déjà.
   ══════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const SETTLE = 420;
const RELEASE = 900;

export type ScrollSpySection = { id: string; label: string };
export type UseScrollSpyOptions = {
  sections: ScrollSpySection[];
  offset?: number;
  onChange?: (id: string) => void;
};

export function useScrollSpy({ sections, offset = 96, onChange }: UseScrollSpyOptions) {
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = useState(() => sections[0]?.id ?? "");
  const [announce, setAnnounce] = useState("");
  const list = useRef(sections);
  const emit = useRef(onChange);
  useEffect(() => {
    list.current = sections;
    emit.current = onChange;
  });
  const frame = useRef(0);
  const lock = useRef<string | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  const key = sections.map((s) => s.id).join("|");

  const measure = useCallback(() => {
    const items = list.current;
    if (items.length === 0) return "";
    const viewport = window.innerHeight;
    const top = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, top / max)) : 1;
    const line = offset + ratio * Math.max(0, viewport - offset - 1);
    let current = "";
    let last = "";
    for (const item of items) {
      const node = document.getElementById(item.id);
      if (!node) continue;
      last = item.id;
      if (!current) current = item.id;
      if (node.getBoundingClientRect().top <= line + 1) current = item.id;
    }
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    return atEnd && last ? last : current;
  }, [offset]);

  const release = useCallback(() => {
    lock.current = null;
    if (lockTimer.current) { clearTimeout(lockTimer.current); lockTimer.current = null; }
  }, []);

  const sync = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const next = measure();
      if (!next) return;
      if (lock.current) { if (lock.current === next) release(); return; }
      setActiveId((prev) => (prev === next ? prev : next));
    });
  }, [measure, release]);

  useEffect(() => {
    const abandon = () => { if (lock.current) release(); };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("wheel", abandon, { passive: true });
    window.addEventListener("touchstart", abandon, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(document.documentElement);
    for (const id of key ? key.split("|") : []) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    sync();
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("wheel", abandon);
      window.removeEventListener("touchstart", abandon);
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [sync, release, key]);

  useEffect(() => {
    if (!activeId) return;
    emit.current?.(activeId);
    if (!started.current) { started.current = true; return; }
    settleTimer.current = setTimeout(() => {
      const item = list.current.find((s) => s.id === activeId);
      setAnnounce(item ? item.label : "");
    }, SETTLE);
    return () => { if (settleTimer.current) clearTimeout(settleTimer.current); };
  }, [activeId]);

  const scrollTo = useCallback(
    (id: string) => {
      const node = document.getElementById(id);
      if (!node) return;
      lock.current = id;
      setActiveId(id);
      const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const H = rect.top + window.scrollY;
      const usable = Math.max(0, viewport - offset - 1);
      const top = max > 0 ? Math.min(max, Math.max(0, (H - offset) / (1 + usable / max))) : 0;
      window.scrollTo({ top, behavior });
      if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
      node.focus({ preventScroll: true });
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => { lock.current = null; lockTimer.current = null; sync(); }, RELEASE);
    },
    [offset, reduced, sync],
  );

  const getLinkProps = useCallback(
    (id: string) => ({
      href: `#${id}`,
      "aria-current": id === activeId ? ("location" as const) : undefined,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        scrollTo(id);
      },
    }),
    [activeId, scrollTo],
  );

  const activeIndex = sections.findIndex((s) => s.id === activeId);
  return { activeId, activeIndex, scrollTo, getLinkProps, announce };
}
