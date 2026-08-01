"use client";

/* Browser-framed product mockups, one per feature family.
   Chaque mockup se joue comme une courte démo quand il entre à l'écran :
   la courbe se dessine, la conversation se déroule, le code s'écrit. */

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Légende d'une ligne sous chaque mockup : dire ce qu'on regarde. */
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-5 max-w-3xl text-center text-[13px] leading-relaxed text-black/45">
      {children}
    </p>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[12px] bg-black shadow-[0_0_110px_-8px_rgba(15,16,19,0.55),0_0_44px_-6px_rgba(15,16,19,0.35),0_22px_56px_-16px_rgba(15,16,19,0.4)] ring-1 ring-white/[0.08]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>
      {children}
    </div>
  );
}

/* ————— PAYD dashboard (moteurs défensifs) ————— */

const RELANCES = [
  { n: 1, client: "Sarl Bâti Caraïbe", d: "+5j", statut: "Payé", montant: "4 820 €", up: true },
  { n: 2, client: "Garage Petit-Bourg", d: "+2j", statut: "Relancé", montant: "1 260 €", up: true },
  { n: 3, client: "Villa Kariba", d: "+12j", statut: "Relance 2", montant: "2 400 €", up: false },
  { n: 4, client: "SCI Lauricisque", d: "+21j", statut: "Mise en demeure", montant: "6 150 €", up: false },
  { n: 5, client: "Resto La Datcha", d: "+1j", statut: "Payé", montant: "890 €", up: true },
];

export function DashboardMockup() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const line = ref.current?.querySelector<SVGPathElement>("[data-chart-line]");
      if (!line) return;
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      gsap
        .timeline({
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
        })
        .to(line, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" })
        .from("[data-chart-fill]", { opacity: 0, duration: 0.9, ease: "power1.out" }, "-=1.1")
        .from(
          "[data-row]",
          { opacity: 0, y: 12, duration: 0.45, ease: "power3.out", stagger: 0.09 },
          "-=1.6"
        );
    },
    { scope: ref }
  );

  /* v6 console compacte (21/07, « plus petit, change le design ») :
     3 KPI en rangée + mini-courbe + 3 relances. Chiffres réels du jeu de
     données : 5 710 = 4 820 + 890 (payés), 9 810 = 1 260 + 2 400 + 6 150. */
  return (
    <div className="mx-auto max-w-[760px]">
      <BrowserFrame>
      <div ref={ref} className="p-4 text-[12px] sm:p-5">
        {/* header compact */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-white/[0.08] text-[11px] font-bold text-[#e0b341]">
            V
          </span>
          <div className="text-[13px] font-semibold text-white">
            Votre entreprise
            <span className="ml-2 font-normal text-white/40">Tableau de bord · PAYD</span>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/70">
            7 derniers jours
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        {/* 3 KPI en rangée */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.06] rounded-[10px] border border-white/[0.07] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="px-4 py-3.5">
            <div className="whitespace-nowrap text-[11px] text-white/45">Cash récupéré</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="num whitespace-nowrap text-[17px] font-semibold leading-none text-white sm:text-[19px]">5 710 €</span>
              <span className="num whitespace-nowrap text-[10.5px] font-medium text-mint">↑ 12 %</span>
            </div>
          </div>
          <div className="px-4 py-3.5">
            <div className="whitespace-nowrap text-[11px] text-white/45">Recouvrement</div>
            <div className="num mt-1.5 whitespace-nowrap text-[17px] font-semibold leading-none text-white sm:text-[19px]">89,8 %</div>
          </div>
          <div className="px-4 py-3.5">
            <div className="whitespace-nowrap text-[11px] text-white/45">En attente</div>
            <div className="num mt-1.5 whitespace-nowrap text-[17px] font-semibold leading-none text-white/80 sm:text-[19px]">9 810 €</div>
          </div>
        </div>

        {/* mini-courbe — même tracé, écrasé en bandeau */}
        <div className="mt-3 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-4 pb-2 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="h-[72px] w-full sm:h-[84px]">
            <defs>
              <linearGradient id="orangefill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f78320" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#f78320" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path data-chart-fill d="M0.0 41.0 L8.0 58.6 L16.0 63.6 L24.0 59.2 L34.7 65.4 L44.0 72.3 L52.0 82.6 L62.7 88.0 L70.7 95.0 L76.0 106.0 L81.3 115.1 L84.0 117.7 L92.0 106.2 L100.0 101.5 L108.0 99.5 L116.0 99.0 L124.0 96.1 L132.0 100.8 L137.3 91.8 L144.0 81.6 L152.0 80.0 L157.3 86.9 L164.0 88.1 L172.0 93.0 L180.0 86.8 L186.7 79.0 L192.0 67.0 L197.3 70.3 L204.0 73.4 L212.0 80.0 L217.3 69.3 L222.7 56.6 L228.0 43.6 L236.0 46.2 L242.7 46.6 L248.0 42.3 L253.3 52.8 L258.7 61.2 L264.0 72.2 L269.3 76.9 L274.7 76.6 L280.0 72.2 L288.0 66.5 L294.7 62.3 L300.0 54.0 L305.3 63.2 L310.7 71.9 L316.0 87.8 L321.3 99.2 L324.0 106.0 L329.3 99.7 L334.7 96.7 L340.0 90.4 L345.3 101.8 L350.7 110.7 L356.0 116.4 L361.3 110.2 L366.7 102.8 L372.0 98.2 L377.3 108.8 L382.7 119.1 L388.0 126.8 L396.0 115.0 L400.0 107.6 L400 150 L0 150 Z" fill="url(#orangefill)" />
            <path
              data-chart-line
              d="M0.0 41.0 L8.0 58.6 L16.0 63.6 L24.0 59.2 L34.7 65.4 L44.0 72.3 L52.0 82.6 L62.7 88.0 L70.7 95.0 L76.0 106.0 L81.3 115.1 L84.0 117.7 L92.0 106.2 L100.0 101.5 L108.0 99.5 L116.0 99.0 L124.0 96.1 L132.0 100.8 L137.3 91.8 L144.0 81.6 L152.0 80.0 L157.3 86.9 L164.0 88.1 L172.0 93.0 L180.0 86.8 L186.7 79.0 L192.0 67.0 L197.3 70.3 L204.0 73.4 L212.0 80.0 L217.3 69.3 L222.7 56.6 L228.0 43.6 L236.0 46.2 L242.7 46.6 L248.0 42.3 L253.3 52.8 L258.7 61.2 L264.0 72.2 L269.3 76.9 L274.7 76.6 L280.0 72.2 L288.0 66.5 L294.7 62.3 L300.0 54.0 L305.3 63.2 L310.7 71.9 L316.0 87.8 L321.3 99.2 L324.0 106.0 L329.3 99.7 L334.7 96.7 L340.0 90.4 L345.3 101.8 L350.7 110.7 L356.0 116.4 L361.3 110.2 L366.7 102.8 L372.0 98.2 L377.3 108.8 L382.7 119.1 L388.0 126.8 L396.0 115.0 L400.0 107.6"
              fill="none"
              stroke="#f78320"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="grid grid-cols-4 pt-1 text-center text-[10px] text-white/35">
            <span>Avril</span><span>Mai</span><span>Juin</span><span>Juil</span>
          </div>
        </div>

        {/* 3 relances compactes */}
        <div className="mt-3 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {RELANCES.filter((r) => [1, 2, 4].includes(r.n)).map((r) => {
            const paye = r.statut === "Payé";
            const alerte = r.statut === "Mise en demeure";
            return (
              <div key={r.n} data-row className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${paye ? "bg-mint" : alerte ? "bg-[#ed6a5f]" : "bg-white/30"}`} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-white/90">{r.client}</span>
                <span className={`shrink-0 text-[11px] ${alerte ? "text-[#ed6a5f]" : "text-white/40"}`}>{r.statut}</span>
                <span className={`num w-[74px] shrink-0 text-right text-[12.5px] ${paye ? "font-medium text-mint" : "text-white/70"}`}>
                  {paye ? "+ " : ""}{r.montant}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      </BrowserFrame>
      <Caption>
        Le tableau de bord Omega — le cash récupéré par PAYD et les relances
        de la semaine, en temps réel.
      </Caption>
    </div>
  );
}

/* ————— REVIVE WhatsApp thread (moteurs offensifs) ————— */

export function ChatMockup() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap
        .timeline({
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
        })
        .from("[data-msg]", {
          opacity: 0,
          y: 16,
          scale: 0.97,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.7,
        })
        .from("[data-note]", { opacity: 0, duration: 0.6, ease: "power1.out" }, "+=0.2");
    },
    { scope: ref }
  );

  /* Conversation client — interface de messagerie PRO au langage Omega
     (pas une réplique grand public) : fenêtre sombre épurée, header canal +
     badge moteur, bulles sobres, horodatage Mono, trace système en pied. */
  return (
    <div>
      <div
        ref={ref}
        className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[12px] bg-black shadow-[0_0_110px_-8px_rgba(15,16,19,0.55),0_0_44px_-6px_rgba(15,16,19,0.35),0_22px_56px_-16px_rgba(15,16,19,0.4)] ring-1 ring-white/[0.08]"
      >
        {/* header — le canal, pas une app */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[13px] font-semibold text-white/85">
            C
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-white">M. Sainte-Rose</div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">
              Canal WhatsApp · CARMO Toyota
            </div>
          </div>
          <span className="num ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.08] px-2.5 py-1 text-[10.5px] text-gold">
            <span className="h-1 w-1 rounded-full bg-gold" />
            REVIVE
          </span>
        </div>

        {/* fil de conversation */}
        <div className="space-y-3 px-5 py-5">
          <div className="flex justify-center pb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
              aujourd&apos;hui
            </span>
          </div>

          <div data-msg className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-tr-[4px] border border-white/[0.09] bg-white/[0.07] px-4 py-3 text-[13.5px] leading-relaxed text-white/85">
              Bonjour M. Sainte-Rose, ici l&apos;atelier CARMO Toyota. Votre
              dernier entretien remonte à mai 2025 et votre Hilux approche de
              l&apos;échéance des 10 000 km. Souhaitez-vous que nous vous
              réservions un créneau jeudi matin ?
              <div className="num mt-1.5 text-right text-[10.5px] text-white/35">
                07:02 · envoyé après validation
              </div>
            </div>
          </div>

          <div data-msg className="flex justify-start">
            <div className="max-w-[85%] rounded-xl rounded-tl-[4px] bg-white/[0.04] px-4 py-3 text-[13.5px] leading-relaxed text-white/80">
              Ah oui c&apos;est vrai 😅 Jeudi 9h c&apos;est possible ?
              <div className="num mt-1.5 text-[10.5px] text-white/35">08:47</div>
            </div>
          </div>

          <div data-msg className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-tr-[4px] border border-white/[0.09] bg-white/[0.07] px-4 py-3 text-[13.5px] leading-relaxed text-white/85">
              Parfait, c&apos;est confirmé : jeudi à 9 h, atelier de
              Baie-Mahault. Un rappel vous sera envoyé la veille. Excellente
              journée.
              <div className="num mt-1.5 text-right text-[10.5px] text-white/35">08:47</div>
            </div>
          </div>
        </div>

        {/* trace système — pied de fenêtre */}
        <div data-note className="flex items-center gap-2.5 border-t border-white/[0.07] bg-white/[0.03] px-5 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="font-mono text-[11px] text-white/50">
            RDV ajouté à l&apos;agenda atelier · fiche client mise à jour
          </span>
        </div>
      </div>

      <Caption>
        REVIVE en situation — un client sans commande depuis 14 mois, un
        rendez-vous pris en deux messages, sur WhatsApp.
      </Caption>
    </div>
  );
}

/* ————— BILLD Factur-X editor (pépites) ————— */

const CODE_LINES: [string, React.ReactNode][] = [
  ["1", <span key="1"><span className="text-[#7ee787]">&lt;?xml</span> <span className="text-[#79c0ff]">version</span>=<span className="text-[#a5d6ff]">&quot;1.0&quot;</span> <span className="text-[#7ee787]">?&gt;</span></span>],
  ["2", <span key="2"><span className="text-[#7ee787]">&lt;rsm:CrossIndustryInvoice&gt;</span>  <span className="text-white/30">&lt;!-- Factur-X · EN 16931 --&gt;</span></span>],
  ["3", <span key="3">  <span className="text-[#7ee787]">&lt;ram:ID&gt;</span><span className="text-white/85">FA-2026-0912</span><span className="text-[#7ee787]">&lt;/ram:ID&gt;</span></span>],
  ["4", <span key="4">  <span className="text-[#7ee787]">&lt;ram:IssueDateTime&gt;</span><span className="text-white/85">2026-09-01</span><span className="text-[#7ee787]">&lt;/ram:IssueDateTime&gt;</span></span>],
  ["5", <span key="5">  <span className="text-[#7ee787]">&lt;ram:SellerTradeParty&gt;</span><span className="text-white/85">CARMO Toyota Guadeloupe</span><span className="text-[#7ee787]">&lt;/…&gt;</span></span>],
  ["6", <span key="6">  <span className="text-[#7ee787]">&lt;ram:GrandTotalAmount&gt;</span><span className="text-[#f78320]">12 480,00</span><span className="text-[#7ee787]">&lt;/ram:GrandTotalAmount&gt;</span></span>],
  ["7", <span key="7"><span className="text-[#7ee787]">&lt;/rsm:CrossIndustryInvoice&gt;</span></span>],
  ["8", <span key="8"><span className="text-white/30">✓ conforme — prête pour le portail public de facturation</span></span>],
];

export function CodeMockup() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap
        .timeline({
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
        })
        .from("[data-line]", {
          opacity: 0,
          x: -10,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.22,
        });
    },
    { scope: ref }
  );

  return (
    <div>
      <BrowserFrame>
        <div ref={ref} className="overflow-x-auto p-6 sm:p-8">
          <pre className="num min-w-[540px] text-[13px] leading-7">
            {CODE_LINES.map(([n, content]) => (
              <div key={n} data-line className="flex gap-5">
                <span className="w-4 select-none text-right text-white/25">{n}</span>
                <code>{content}</code>
              </div>
            ))}
          </pre>
        </div>
      </BrowserFrame>
      <Caption>
        BILLD au travail — une facture convertie au format Factur-X exigé au
        1ᵉʳ septembre 2026, contrôlée avant émission.
      </Caption>
    </div>
  );
}
