import type { Demo } from "@/lib/fiches";

/* Rendus visuels propres à chaque moteur — un type de démo par métier :
   frise de relance, conversation, facture scannée, brief matinal,
   calendrier éditorial, liste à statuts. */

function ChatDemo({ demo }: { demo: Extract<Demo, { type: "chat" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="border-b border-white/[0.06] pb-3">
        <div className="text-[14px] font-medium text-white">{demo.title}</div>
        <div className="text-[12px] text-white/40">{demo.sub}</div>
      </div>
      <div className="mt-4 space-y-3">
        {demo.messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "bot"
                ? "ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-gold/15 px-3.5 py-2.5 text-[13px] text-white/90"
                : "max-w-[85%] rounded-lg rounded-tl-none bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-white/90"
            }
          >
            {m.text}
            <div
              className={`num mt-1 text-[10px] text-white/35 ${m.from === "bot" ? "text-right" : ""}`}
            >
              {m.time}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        {demo.note}
      </div>
    </div>
  );
}

function TimelineDemo({ demo }: { demo: Extract<Demo, { type: "timeline" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="text-[14px] font-medium text-white">{demo.title}</div>
      <div className="mt-5 space-y-0">
        {demo.items.map((it, i) => (
          <div key={it.k} className="relative flex gap-4 pb-6 last:pb-0">
            {i < demo.items.length - 1 && (
              <span className="absolute left-[26px] top-7 h-full w-px bg-white/10" />
            )}
            <span className="num z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[12px] font-semibold text-gold">
              {it.k}
            </span>
            <div className="pt-1.5">
              <div className="text-[14px] font-medium text-white">{it.label}</div>
              <div className="mt-0.5 text-[13px] text-white/45">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocDemo({ demo }: { demo: Extract<Demo, { type: "doc" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="rounded bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
          OCR
        </span>
        <span className="text-[14px] font-medium text-white">{demo.title}</span>
      </div>
      <div className="mt-4 divide-y divide-white/[0.06] rounded border border-white/[0.08]">
        {demo.fields.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[13px] text-white/45">{k}</span>
            <span className="num text-[13px] text-white/90">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        {demo.status}
      </div>
    </div>
  );
}

function MessageDemo({ demo }: { demo: Extract<Demo, { type: "message" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="ml-auto max-w-full rounded-lg rounded-tr-none bg-gold/15 p-4">
        <div className="text-[13px] font-semibold text-white">{demo.title}</div>
        <div className="mt-3 space-y-3">
          {demo.lines.map((l) => (
            <div key={l.label}>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-gold">
                {l.label}
              </span>
              <p className="mt-0.5 text-[13px] leading-relaxed text-white/85">{l.text}</p>
            </div>
          ))}
        </div>
        <div className="num mt-3 text-right text-[10px] text-white/35">07:00</div>
      </div>
    </div>
  );
}

function CalendarDemo({ demo }: { demo: Extract<Demo, { type: "calendar" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="text-[14px] font-medium text-white">{demo.title}</div>
      <div className="mt-4 space-y-2">
        {demo.items.map((it) => (
          <div
            key={it.day + it.canal}
            className="flex items-center gap-3 rounded border border-white/[0.08] px-3.5 py-3"
          >
            <span className="num w-9 shrink-0 text-[12px] font-semibold uppercase text-gold">
              {it.day}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">{it.text}</span>
            <span className="shrink-0 rounded bg-white/[0.07] px-2 py-0.5 text-[11px] text-white/55">
              {it.canal}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        Lot validé en une relecture : publication automatique
      </div>
    </div>
  );
}

const TONE: Record<"ok" | "warn" | "off", string> = {
  ok: "bg-mint/10 text-mint",
  warn: "bg-gold/10 text-gold",
  off: "bg-white/[0.07] text-white/45",
};

function ListDemo({ demo }: { demo: Extract<Demo, { type: "list" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0b0e] p-5 sm:p-6">
      <div className="text-[14px] font-medium text-white">{demo.title}</div>
      <div className="mt-4 space-y-2">
        {demo.items.map((it) => (
          <div
            key={it.text}
            className="flex items-center gap-3 rounded border border-white/[0.08] px-3.5 py-3"
          >
            <span className="min-w-0 flex-1 text-[13px] text-white/85">{it.text}</span>
            <span
              className={`num shrink-0 rounded px-2 py-0.5 text-[11px] ${TONE[it.tone]}`}
            >
              {it.badge}
            </span>
          </div>
        ))}
      </div>
      {demo.footer && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          {demo.footer}
        </div>
      )}
    </div>
  );
}

export default function DemoRenderer({ demo }: { demo: Demo }) {
  switch (demo.type) {
    case "chat":
      return <ChatDemo demo={demo} />;
    case "timeline":
      return <TimelineDemo demo={demo} />;
    case "doc":
      return <DocDemo demo={demo} />;
    case "message":
      return <MessageDemo demo={demo} />;
    case "calendar":
      return <CalendarDemo demo={demo} />;
    case "list":
      return <ListDemo demo={demo} />;
  }
}
