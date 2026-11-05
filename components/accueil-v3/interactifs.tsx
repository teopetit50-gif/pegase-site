"use client";

/* Les morceaux de l'accueil qui bougent — recopiés du comportement de la
   référence (agent-ai-v1.21st.app) :
     · le menu du téléphone (bouton « Toggle menu », sous md) ;
     · la grande citation, qui change toutes les 6 s, points cliquables ;
     · les chiffres, qui comptent depuis 0 à leur entrée à l'écran ;
     · la FAQ : filtres en pastilles, accordéon en hauteur 300 ms.
   Écart assumé : l'accordéon de la référence n'expose pas l'état de ses
   filtres ; ici chaque filtre porte aria-pressed. */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Pause, Play, Plus, X } from "lucide-react";
import { AUDIT, CITATIONS, FAQ, FAQ_CATEGORIES, NAV } from "./textes";

export function MenuTelephone() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    document.documentElement.style.overflow = ouvert ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [ouvert]);
  return (
    <>
      <button
        className="md:hidden text-white z-50"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        {ouvert ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      {ouvert && (
        <div className="aa-fade-in md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-neutral-950 border-t border-white/[0.06] px-6 py-8 flex flex-col gap-1">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              className="py-3 text-lg text-white/70 hover:text-white transition-colors border-b border-white/[0.06]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/espace2"
            onClick={() => setOuvert(false)}
            className="py-3 text-lg text-white/70 hover:text-white transition-colors"
          >
            Espace client
          </Link>
          <Link
            href={AUDIT}
            onClick={() => setOuvert(false)}
            className="mt-6 bg-white text-neutral-950 text-sm font-medium px-4 py-3 rounded-md text-center hover:bg-neutral-200 transition-colors"
          >
            Réserver un audit
          </Link>
        </div>
      )}
    </>
  );
}

export function Citations() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CITATIONS.length), 6000);
    return () => clearInterval(t);
  }, [i]);
  const c = CITATIONS[i];
  return (
    <div className="max-w-4xl mx-auto text-center ">
      <div key={i} className="aa-fade-in">
        <blockquote className="text-2xl md:text-4xl lg:text-5xl font-normal text-white leading-[1.2] tracking-tight mb-12 md:mb-16">
          «&nbsp;{c.texte}&nbsp;»
        </blockquote>
        <div className="flex items-center justify-center mb-6">
          <Image src="/logo-pegase-blanc.png" alt="" width={32} height={32} className="w-8 h-8 opacity-90" />
        </div>
        <div className="space-y-1">
          <p className="text-base md:text-lg font-medium text-white">{c.signe}</p>
          <p className="text-sm md:text-base text-white/50">{c.role}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-12 md:mt-16">
        {CITATIONS.map((_, k) => (
          <button
            key={k}
            aria-label={`Afficher la phrase ${k + 1}`}
            aria-current={k === i}
            onClick={() => setI(k)}
            className="group relative p-2"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-500 ${
                k === i ? "w-8 bg-white" : "w-1.5 bg-white/25 group-hover:bg-white/50"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* compte de 0 à la valeur en 1,6 s, à la première entrée à l'écran */
export function Compteur({ valeur, suffixe }: { valeur: number; suffixe: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setN(valeur));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const pas = (t: number) => {
          const p = Math.min(1, (t - t0) / 1600);
          setN(Math.round(valeur * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(pas);
        };
        raf = requestAnimationFrame(pas);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valeur]);
  return (
    <p
      ref={ref}
      className="text-2xl md:text-4xl lg:text-5xl font-normal text-white tracking-tight leading-none tabular-nums"
    >
      {n}
      <span className="text-white/85">{suffixe}</span>
    </p>
  );
}

export function Faq() {
  const [cat, setCat] = useState("Tout");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const liste = FAQ.filter((q) => cat === "Tout" || q.cat === cat);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {FAQ_CATEGORIES.map((c) => (
          <button
            key={c}
            aria-pressed={c === cat}
            onClick={() => {
              setCat(c);
              setOuverte(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              c === cat
                ? "bg-white text-neutral-950"
                : "bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden px-6 md:px-8">
        {liste.map((q) => (
          <Reponse
            key={q.id}
            id={q.id}
            q={q.q}
            r={q.r}
            ouverte={ouverte === q.id}
            basculer={() => setOuverte((o) => (o === q.id ? null : q.id))}
          />
        ))}
      </div>
    </div>
  );
}

function Reponse({
  id,
  q,
  r,
  ouverte,
  basculer,
}: {
  id: string;
  q: string;
  r: string;
  ouverte: boolean;
  basculer: () => void;
}) {
  const corps = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    setH(ouverte ? (corps.current?.scrollHeight ?? 0) : 0);
  }, [ouverte]);
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        id={`faq-${id}-q`}
        aria-expanded={ouverte}
        aria-controls={`faq-${id}-r`}
        onClick={basculer}
        className="w-full flex items-start justify-between gap-4 py-5 md:py-6 text-left group"
      >
        <span
          className={`text-base md:text-lg font-medium leading-snug transition-colors ${
            ouverte ? "text-white" : "text-white/85 group-hover:text-white"
          }`}
        >
          {q}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full border border-white/[0.1] bg-white/[0.02] flex items-center justify-center text-white/55 transition-all duration-300 group-hover:border-white/20 group-hover:text-white ${
            ouverte ? "rotate-45 text-white" : ""
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
        </span>
      </button>
      <div
        id={`faq-${id}-r`}
        role="region"
        aria-labelledby={`faq-${id}-q`}
        style={{ height: h }}
        className="overflow-hidden transition-[height] duration-300 ease-out"
      >
        <div ref={corps} className="pb-5 md:pb-6 pr-12">
          <p className="text-sm md:text-base text-white/55 leading-relaxed">{r}</p>
        </div>
      </div>
    </div>
  );
}

/* La vidéo de démo (9 s, muette, en boucle — source dans
   PEGASE/stories/reels/video-accueil). Elle ne joue que lorsqu'elle est à
   l'écran, jamais en mouvement réduit, et porte un bouton pause : un
   mouvement automatique de plus de 5 s doit pouvoir s'arrêter (WCAG 2.2.2). */
export function VideoDemo({ src, affiche, duree }: { src: string; affiche: string; duree: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lecture, setLecture] = useState(false);
  const arretVoulu = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      arretVoulu.current = true;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !arretVoulu.current) v.play().catch(() => {});
        else if (!e.isIntersecting) v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const basculer = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      arretVoulu.current = false;
      v.play().catch(() => {});
    } else {
      arretVoulu.current = true;
      v.pause();
    }
  };
  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={affiche}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setLecture(true)}
        onPause={() => setLecture(false)}
        aria-label="Démonstration d'Omega : vos agents préparent le travail, vous validez d'un clic"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <button
        onClick={basculer}
        aria-label={lecture ? "Mettre la vidéo en pause" : "Lire la vidéo"}
        className="absolute bottom-4 left-4 flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950/70 backdrop-blur-md border border-white/[0.08] text-white/80 hover:text-white transition-colors"
      >
        {lecture ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-neutral-950/70 backdrop-blur-md border border-white/[0.08]">
        <span className="text-xs font-mono text-white/80">{duree}</span>
      </div>
    </>
  );
}
