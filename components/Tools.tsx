import Reveal from "./Reveal";

const TOOLS: { name: string; className: string }[] = [
  { name: "Gmail", className: "font-semibold tracking-tight" },
  { name: "Google Sheets", className: "font-medium" },
  { name: "WhatsApp", className: "font-bold tracking-tight" },
  { name: "Outlook", className: "font-semibold" },
  { name: "Excel", className: "font-bold" },
  { name: "Stripe", className: "font-semibold italic" },
  { name: "n8n", className: "font-mono font-semibold" },
  { name: "Claude", className: "font-medium tracking-wide" },
];

export default function Tools() {
  return (
    <section>
      <div className="flex h-20 items-center sm:h-24 justify-center">
        <Reveal>
          <p className="px-6 text-center text-lg text-white sm:text-2xl">
            Branché sur les outils que vous avez déjà
          </p>
        </Reveal>
      </div>
      {/* marquee — défilement continu, dupliqué pour boucler sans couture */}
      <div className="overflow-hidden py-10 sm:py-20" aria-label="Outils compatibles">
        <div className="marquee-track flex w-max items-center">
          {[...TOOLS, ...TOOLS].map((t, idx) => (
            <span key={idx} className="flex items-center">
              <span
                className={`whitespace-nowrap px-6 text-xl text-white/80 sm:px-12 sm:text-4xl ${t.className}`}
              >
                {t.name}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold/50" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
