'use client';

/**
 * SmoothScroll — provider Lenis (smooth scroll) synchronisé avec le ticker GSAP.
 *
 * Activation : envelopper le contenu dans app/layout.tsx
 *
 *   import SmoothScroll from '@/components/SmoothScroll';
 *   ...
 *   <body>
 *     <SmoothScroll>{children}</SmoothScroll>
 *   </body>
 *
 * Respecte prefers-reduced-motion (Lenis désactive alors le lissage).
 * La synchro GSAP fait avancer Lenis sur le ticker GSAP : si tu utilises
 * ScrollTrigger, appelle ScrollTrigger.update() dans le lenis 'scroll' (déjà câblé).
 */

import { ReactLenis, type LenisRef } from 'lenis/react';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    lenis?.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(update);
      lenis?.off('scroll', ScrollTrigger.update);
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
