"use client";

/* Vignettes-produit des 8 moteurs — chaque moteur au FORMAT NATIF de son
   canal : PAYD facture · ANSWR bulles WhatsApp · OFFLOAD ligne de tableur ·
   BRIEF email · REVIVE fiche client · POSTD carte de post · REACH terminal ·
   HIRED pile de CV. Une micro-animation par vignette (bascule de statut,
   remplissage, frappe) jouée à l'entrée au viewport, rejouée au survol —
   transform/opacity/clip-path only (keyframes vType/vBlink dans globals),
   hauteurs réservées. Reduced-motion : état final statique.
   Données fictives réalistes, aucun chiffre-promesse inventé. */

import { useEffect, useRef, useState } from "react";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const OR = "#e0b341";
const MINT = "#2fe6a8";

/* ——— hook commun : joue à l'entrée, rejoue au survol ——— */
function usePlay(reduced: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [gen, setGen] = useState(0);
  useEffect(() => {
    if (reduced) {
      setGen(1);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGen((g) => g || 1);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  const replay = () => {
    if (!reduced) setGen((g) => (g ? g + 1 : g));
  };
  return { ref, gen, playing: gen > 0, replay };
}

function usePhase(gen: number, playing: boolean, reduced: boolean, delay: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (reduced) {
      setOn(true);
      return;
    }
    setOn(false);
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [gen, playing, reduced, delay]);
  return on;
}

const PANEL =
  "rounded-xl border border-white/[0.07] bg-[#0e1116] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_56px_-6px_rgba(15,16,19,0.45),0_14px_36px_-12px_rgba(15,16,19,0.3)]";

/* ——— PAYD : LA FACTURE — badge retard → relancée ——— */
export function VFacture({ reduced, big = false }: { reduced: boolean; big?: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const relance = usePhase(gen, playing, reduced, 1100);
  return (
    <div
      ref={ref}
      onPointerEnter={replay}
      className={`${PANEL} ${big ? "min-h-[160px] max-w-lg px-6 py-5" : "min-h-[128px] max-w-md px-5 py-4"} w-full`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] tracking-wide text-white/40">FAC-2026-0182</span>
        <span className="text-[12px] text-white/50">SARL Corbin &amp; Fils</span>
      </div>
      <div className={`num mt-3 leading-none text-white ${big ? "text-[36px]" : "text-[26px]"}`}>
        1 840,00 €
      </div>
      <div className="relative mt-3.5 h-[24px]">
        <span
          className="absolute left-0 top-0 rounded-full border border-[#7f2a2e]/60 bg-[#2a1113] px-2.5 py-0.5 font-mono text-[11px] text-[#e07a7a]"
          style={{
            opacity: relance ? 0 : 1,
            transform: relance ? "translateY(-4px)" : "none",
            transition: reduced ? "none" : `opacity 0.35s ${EASE}, transform 0.35s ${EASE}`,
          }}
        >
          en retard · J+7
        </span>
        <span
          className="absolute left-0 top-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
          style={{
            borderColor: `${OR}66`,
            background: `${OR}14`,
            color: OR,
            opacity: relance ? 1 : 0,
            transform: relance ? "none" : "translateY(4px)",
            transition: reduced ? "none" : `opacity 0.35s ${EASE} 0.1s, transform 0.35s ${EASE} 0.1s`,
          }}
        >
          relancée ✓
        </span>
      </div>
    </div>
  );
}

/* wrapper autonome — utilisable depuis un server component */
export function VFactureAuto({ big = false }: { big?: boolean }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return <VFacture reduced={reduced} big={big} />;
}

/* ——— ANSWR : LA BULLE WHATSAPP — son canal natif, lui seul ——— */
export const CHAT_JOUR = [
  { from: "client" as const, text: "Vous êtes ouverts samedi ? C'est pour une vidange sur un Duster.", time: "14:02" },
  { from: "bot" as const, text: "Oui — samedi 8 h à 13 h. Je peux vous réserver 9 h 30 ?", time: "14:03" },
];
export const CHAT_NUIT = [
  { from: "client" as const, text: "Bonsoir, c'est possible d'avoir un devis pour un carport ?", time: "02:14" },
  { from: "bot" as const, text: "Bien reçu — votre demande est notée. Réponse détaillée dès l'ouverture, à 8 h.", time: "02:14" },
];

export function VChat({
  bulles,
  reduced,
}: {
  bulles: { from: "client" | "bot"; text: string; time: string }[];
  reduced: boolean;
}) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  return (
    <div ref={ref} onPointerEnter={replay} className="min-h-[120px] w-full max-w-md space-y-2">
      {bulles.map((b, i) => (
        <div
          key={`${gen}-${i}`}
          className={`flex ${b.from === "client" ? "justify-start" : "justify-end"}`}
          style={{
            opacity: playing ? 1 : 0,
            transform: playing ? "none" : "translateY(8px)",
            transition: reduced
              ? "none"
              : `opacity 0.5s ${EASE} ${i * 450}ms, transform 0.5s ${EASE} ${i * 450}ms`,
          }}
        >
          <div className={`${PANEL} max-w-[85%] px-4 py-2.5 ${b.from === "bot" ? "border-white/[0.12]" : ""}`}>
            <p className="text-[13px] leading-relaxed text-white/75">{b.text}</p>
            <div className="mt-1 text-right font-mono text-[10px] text-white/30">{b.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* cadre téléphone pour ANSWR (réf. mockup agent Qonto → WhatsApp Omega) */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[248px] rounded-[36px] border border-white/[0.12] bg-[#0e1116] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_56px_-6px_rgba(15,16,19,0.45),0_14px_36px_-12px_rgba(15,16,19,0.3)]">
      <div className="mx-auto mb-2.5 h-[5px] w-16 rounded-full bg-white/15" />
      <div className="rounded-[24px] bg-[#0e1116] px-2.5 pb-3 pt-2.5">
        <div className="mb-2.5 flex items-center gap-2 border-b border-white/[0.07] pb-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.08] font-mono text-[9px] text-white/70">
            A
          </span>
          <span className="text-[11px] font-medium text-white/80">ANSWR</span>
          <span className="ml-auto font-mono text-[9px] text-[#2fe6a8]">en ligne</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ——— OFFLOAD : LA LIGNE DE TABLEUR ——— */
export function VTableur({ reduced }: { reduced: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const done = usePhase(gen, playing, reduced, 1500);
  const cols = [
    ["Fournisseur", "Caraïbe Pièces Auto"],
    ["HT", "1 240,00"],
    ["TVA 8,5", "105,40"],
    ["TTC", "1 345,40"],
    ["Échéance", "11/08"],
  ];
  return (
    <div ref={ref} onPointerEnter={replay} className={`${PANEL} min-h-[118px] w-full max-w-md px-4 py-3.5`}>
      <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-x-3">
        {cols.map(([h]) => (
          <span
            key={h}
            className="border-b border-white/[0.08] pb-1.5 font-mono text-[10px] uppercase tracking-wide text-white/30"
          >
            {h}
          </span>
        ))}
        {cols.map(([h, v], i) => (
          <span
            key={`${gen}-${h}`}
            className="truncate pt-2 font-mono text-[11px] text-white/75"
            style={{
              opacity: playing ? 1 : 0,
              transition: reduced ? "none" : `opacity 0.3s ease-out ${200 + i * 220}ms`,
            }}
          >
            {v}
          </span>
        ))}
      </div>
      <div
        className="mt-3 font-mono text-[11px]"
        style={{
          color: MINT,
          opacity: done ? 1 : 0,
          transform: done ? "none" : "translateY(4px)",
          transition: reduced ? "none" : `opacity 0.4s ${EASE}, transform 0.4s ${EASE}`,
        }}
      >
        ✓ transmis au cabinet
      </div>
    </div>
  );
}

/* ——— BRIEF : L'EMAIL MATINAL ——— */
export function VEmail({
  objet,
  lines,
  reduced,
}: {
  objet: string;
  lines: string[];
  reduced: boolean;
}) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  return (
    <div ref={ref} onPointerEnter={replay} className={`${PANEL} min-h-[140px] w-full max-w-md overflow-hidden`}>
      <div className="border-b border-white/[0.07] px-5 py-2.5">
        <div className="text-[12px] text-white/50">
          De : <span className="text-white/75">Omega</span>
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-white/85">Objet : {objet}</div>
      </div>
      <div className="space-y-1.5 px-5 py-3.5">
        {lines.map((l, i) => (
          <p
            key={`${gen}-${i}`}
            className="font-mono text-[11.5px] leading-relaxed text-white/60"
            style={{
              opacity: playing ? 1 : 0,
              transition: reduced ? "none" : `opacity 0.4s ease-out ${250 + i * 250}ms`,
            }}
          >
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ——— REVIVE : LA FICHE CLIENT QUI SE RALLUME ——— */
export function VFiche({ reduced }: { reduced: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const lit = usePhase(gen, playing, reduced, 1100);
  return (
    <div ref={ref} onPointerEnter={replay} className={`${PANEL} min-h-[140px] w-full max-w-md px-5 py-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[15px] font-medium text-white/90">Mme Larcher</div>
          <div className="mt-1 text-[12px] text-white/45">dernier passage : il y a 14 mois</div>
          <div className="mt-0.5 font-mono text-[11px] text-white/35">12 visites en 2024 · soin visage</div>
        </div>
        <div className="relative h-[24px] w-[104px] shrink-0">
          <span
            className="absolute right-0 top-0 rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[11px] text-white/40"
            style={{ opacity: lit ? 0 : 1, transition: reduced ? "none" : "opacity 0.35s ease-out" }}
          >
            dormante
          </span>
          <span
            className="absolute right-0 top-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
            style={{
              borderColor: `${MINT}55`,
              background: `${MINT}14`,
              color: MINT,
              opacity: lit ? 1 : 0,
              transform: lit ? "none" : "translateY(4px)",
              transition: reduced ? "none" : `opacity 0.35s ${EASE} 0.1s, transform 0.35s ${EASE} 0.1s`,
            }}
          >
            recontactée
          </span>
        </div>
      </div>
      <p
        className="mt-4 border-t border-white/[0.07] pt-3 text-[12px] italic leading-relaxed text-white/45"
        style={{ opacity: lit ? 1 : 0, transition: reduced ? "none" : "opacity 0.5s ease-out 0.15s" }}
      >
        « Bonjour Mme Larcher, ici Beauté Kréol. Votre créneau du samedi matin
        est à nouveau disponible… »
      </p>
    </div>
  );
}

/* ——— POSTD : LA CARTE DE POST ——— */
export function VPost({ reduced }: { reduced: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const ok = usePhase(gen, playing, reduced, 900);
  return (
    <div ref={ref} onPointerEnter={replay} className={`${PANEL} min-h-[150px] w-full max-w-md overflow-hidden`}>
      <div className="relative h-[64px] bg-[linear-gradient(120deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
        <svg className="absolute bottom-2 left-4 opacity-30" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="#fff" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.5" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" />
        </svg>
      </div>
      <div className="px-5 py-3.5">
        <p className="truncate text-[13px] text-white/80">
          Conseil : préparer son véhicule à la saison cyclonique
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] text-white/40">programmé — mar. 18:00</span>
          <span
            key={gen}
            className="font-mono text-[11px]"
            style={{ color: MINT, opacity: ok ? 1 : 0, transition: reduced ? "none" : "opacity 0.4s ease-out" }}
          >
            ✓ file d&apos;attente
          </span>
        </div>
      </div>
    </div>
  );
}

/* ——— REACH : LE TERMINAL DE PROSPECTION ——— */
export function VTerminal({ reduced }: { reduced: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const lines = [
    "→ trouvé : menuiserie, Baie-Mahault",
    "→ fiche enrichie ✓",
    "→ séquence 1/3 envoyée",
  ];
  return (
    <div
      ref={ref}
      onPointerEnter={replay}
      className="min-h-[110px] w-full max-w-md rounded-xl border border-white/[0.07] bg-[#0e1116] px-4 py-3.5 font-mono text-[12px] leading-[1.9]"
    >
      {lines.map((l, i) => (
        <div key={`${gen}-${i}`} className="flex text-white/70">
          <span
            className="whitespace-pre"
            style={
              playing && !reduced
                ? {
                    clipPath: "inset(0 100% 0 0)",
                    animation: `vType 0.7s steps(${l.length}, end) forwards`,
                    animationDelay: `${i * 850}ms`,
                  }
                : { opacity: playing ? 1 : 0 }
            }
          >
            {l}
          </span>
        </div>
      ))}
      <span
        className="mt-0.5 inline-block h-[13px] w-[7px] bg-white/60 align-middle"
        style={{ animation: reduced ? "none" : "vBlink 1s steps(1) infinite" }}
      />
    </div>
  );
}

/* ——— HIRED : LA PILE DE CV ——— */
export function VCv({ reduced }: { reduced: boolean }) {
  const { ref, gen, playing, replay } = usePlay(reduced);
  const picked = usePhase(gen, playing, reduced, 1000);
  const docs = [
    { rot: -7, x: -34, label: "hors profil" },
    { rot: 5, x: 34, label: "hors profil" },
    { rot: 0, x: 0, label: "entretien à proposer", pick: true },
  ];
  return (
    <div ref={ref} onPointerEnter={replay} className="relative min-h-[150px] w-full max-w-md">
      <div className="relative mx-auto h-[140px] w-[240px]" key={gen}>
        {docs.map((d, i) => (
          <div
            key={i}
            className={`${PANEL} absolute left-1/2 top-1/2 h-[110px] w-[86px] -translate-x-1/2 -translate-y-1/2 px-2.5 py-2.5`}
            style={{
              transform: `translate(calc(-50% + ${d.x}px), -50%) rotate(${d.rot}deg) ${
                d.pick && picked ? "translateY(-8px) scale(1.06)" : ""
              }`,
              opacity: picked && !d.pick ? 0.38 : 1,
              borderColor: d.pick && picked ? `${MINT}66` : undefined,
              zIndex: d.pick ? 2 : 1,
              transition: reduced
                ? "none"
                : `transform 0.45s ${EASE}, opacity 0.45s ${EASE}, border-color 0.45s ${EASE}`,
            }}
          >
            <div className="h-1.5 w-3/4 rounded-sm bg-white/25" />
            <div className="mt-2 space-y-1.5">
              {[1, 0.9, 0.65, 0.8, 0.5].map((w, j) => (
                <div key={j} className="h-1 rounded-sm bg-white/[0.12]" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
            <div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px]"
              style={{
                color: d.pick ? MINT : "rgba(255,255,255,0.3)",
                opacity: picked ? 1 : 0,
                transition: reduced ? "none" : "opacity 0.4s ease-out 0.1s",
              }}
            >
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
