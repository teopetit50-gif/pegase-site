"use client";

/* Façade légère des totems 3D : les vrais composants (three/R3F/drei) vivent
   dans totems/TotemSystem.tsx et ne sont chargés que lorsqu'un slot approche
   du viewport (rootMargin 600px) — rien de three dans le bundle initial.
   La hauteur du slot est réservée par le parent : zéro layout shift. */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { TotemKind } from "./totems/TotemSystem";

const SystemRoot = dynamic(() => import("./totems/TotemSystem").then((m) => m.SystemRoot), {
  ssr: false,
});
const SystemSlot = dynamic(() => import("./totems/TotemSystem").then((m) => m.SystemSlot), {
  ssr: false,
});

/* un seul signal module : dès qu'un slot approche, tout le système se charge
   (le canvas racine écoute aussi ce signal) */
let wanted = false;
const wantSubs = new Set<() => void>();
const want = () => {
  if (wanted) return;
  wanted = true;
  wantSubs.forEach((f) => f());
};

export function TotemSlot({ kind }: { kind: TotemKind }) {
  const ref = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (wanted) {
      setLoad(true);
      return;
    }
    const sync = () => setLoad(true);
    wantSubs.add(sync);
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          want();
          io.disconnect();
        }
      },
      { rootMargin: "600px" }
    );
    if (el) io.observe(el);
    return () => {
      wantSubs.delete(sync);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      {load && <SystemSlot kind={kind} />}
    </div>
  );
}

export function TotemsRoot() {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (wanted) {
      setLoad(true);
      return;
    }
    const sync = () => setLoad(true);
    wantSubs.add(sync);
    return () => {
      wantSubs.delete(sync);
    };
  }, []);
  return load ? <SystemRoot /> : null;
}
