import Image from "next/image";
import Reveal from "./Reveal";

/* Marquee de la stack IA — même langage que le bandeau outils du haut
   (défilement continu, typographies variées, points or), mais avec les
   marques IA. Technologies embarquées, jamais présentées comme clients. */
const STACK: { name: string; className: string }[] = [
  { name: "Claude", className: "font-medium tracking-wide" },
  { name: "Mistral AI", className: "font-semibold italic" },
  { name: "NVIDIA", className: "font-bold tracking-tight" },
  { name: "AMD", className: "font-black tracking-widest" },
  { name: "Ollama", className: "font-mono font-semibold" },
  { name: "Hugging Face", className: "font-medium" },
  { name: "Anthropic", className: "font-semibold tracking-tight" },
  { name: "Gemini", className: "font-light tracking-[0.2em]" },
  { name: "Cursor", className: "font-mono font-medium" },
  { name: "ElevenLabs", className: "font-bold" },
];

/* Section « L'infrastructure » (home, monde sombre) — la machine qui fait
   tourner les moteurs, en vue éclatée. Incarne l'argument auto-hébergé /
   local / RGPD du site ; copy repris de l'article rgpd-donnees-locales,
   rien d'inventé. */
export default function Machine() {
  return (
    <section className="border-b border-line-soft">
      {/* défilement des marques IA — miroir du bandeau outils du haut */}
      <div className="overflow-hidden py-10 sm:py-14" aria-label="Stack IA embarquée">
        <div className="marquee-track flex w-max items-center">
          {[...STACK, ...STACK].map((t, idx) => (
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
      <div className="grid items-center gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2 lg:gap-16">
        {/* copy */}
        <div>
          <Reveal>
            <div className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">
              <span aria-hidden className="h-1.5 w-1.5 rounded-[2px] bg-gold" />
              L&apos;infrastructure
            </div>
          </Reveal>
          <Reveal delay={90}>
            <h2 className="mt-5 max-w-xl text-[28px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[44px]">
              Vos données restent dans vos outils.
              <br />
              Jamais recopiées ailleurs.
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Les moteurs Omega ne construisent pas de base de données
              parallèle. Vos données restent dans vos propres outils —
              messagerie, tableur — que les moteurs consultent sur place,
              tâche par tâche, plutôt que de les recopier dans une base à eux.
            </p>
          </Reveal>
          <Reveal delay={270}>
            <ul className="mt-8 space-y-3.5">
              {[
                "Validation humaine — aucun message ne part vers un client sans votre accord explicite.",
                "Aucune exploitation — vos données ne sont ni revendues, ni utilisées pour autre chose que la tâche du moteur.",
                "Traitement au strict nécessaire — les modèles d'intelligence artificielle n'accèdent qu'aux éléments requis par chaque tâche, jamais à l'intégralité d'un fichier.",
              ].map((pt) => (
                <li key={pt} className="flex gap-3">
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span className="text-[15px] leading-relaxed text-white/75">{pt}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* la machine — vue éclatée sur halo or discret */}
        <Reveal delay={150} y={32} scale={0.98} className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 45% at 50% 55%, rgba(224, 179, 65, 0.10), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <Image
            src="/machine-pegase.png"
            alt="L'unité de calcul Omega en vue éclatée — processeur AMD, refroidissement et châssis"
            width={513}
            height={675}
            className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px]"
          />
        </Reveal>
      </div>

    </section>
  );
}
