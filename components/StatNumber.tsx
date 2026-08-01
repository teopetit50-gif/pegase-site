"use client";

import { useEffect, useRef, useState } from "react";

/* Count-up for stat figures: "187 M€" counts 0→187 when scrolled into view.
   Values that don't start with a plain integer (dates like 01.09.2026)
   render statically. */
export default function StatNumber({ value }: { value: string }) {
  const m = value.match(/^(\d{1,4})(\D.*)?$/);
  const suffix = m?.[2] ?? "";
  const animatable = !!m && !suffix.startsWith(".");
  const target = animatable ? parseInt(m![1], 10) : 0;
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!animatable) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        const dur = 1400;
        const tick = (t: number) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animatable, target]);

  return (
    <div
      ref={ref}
      className="num text-[30px] font-semibold leading-none text-gold sm:text-[44px]"
    >
      {animatable ? `${n}${suffix}` : value}
    </div>
  );
}
