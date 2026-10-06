import Image from "next/image";
import Reveal from "./Reveal";

/* ⚠ 14/08/2026 — LE MARQUEE « STACK IA EMBARQUÉE » A ÉTÉ SUPPRIMÉ.
   Il faisait défiler Claude, Mistral AI, NVIDIA, AMD, Ollama, Hugging Face,
   Anthropic, Gemini, Cursor, ElevenLabs : c'était afficher notre stack en
   grand sur la home. Règle posée par Teo : le site ne dit jamais quels
   outils nous utilisons — on écrit « nos automatisations », « notre base de
   données », « nos modèles ». Ne pas le remettre.
   (Ce composant n'est plus importé nulle part depuis la refonte, mais il
   est corrigé pour qu'un futur réemploi ne réintroduise pas la fuite.) */

/* Section « L'infrastructure » (home, monde sombre) — unité de calcul en
   vue éclatée, en illustration. Porte le discours données v3 : espace dédié
   par client, chiffré, hébergé dans l'UE, export et suppression sur demande ;
   copy aligné sur l'article rgpd-donnees-locales, rien d'inventé. */
export default function Machine() {
  return (
    <section className="border-b border-line-soft">
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
              Vos données restent les vôtres.
              <br />
              Chiffrées, séparées, effaçables.
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Chaque client Omega.AI a son espace de données dédié : chiffré,
              hébergé dans l&apos;Union européenne, jamais mélangé avec celui
              d&apos;un autre. Vous gardez vos outils de tous les jours ; les
              moteurs travaillent dans cet espace et n&apos;en sortent que pour
              agir là où sont vos clients : votre messagerie, votre WhatsApp.
            </p>
          </Reveal>
          <Reveal delay={270}>
            <ul className="mt-8 space-y-3.5">
              {[
                "Validation humaine : aucun message ne part vers un client sans votre accord explicite.",
                "Aucune exploitation : vos données ne sont ni revendues, ni utilisées pour autre chose que la tâche du moteur.",
                "Traitement au strict nécessaire : les modèles d'intelligence artificielle n'accèdent qu'aux éléments requis par chaque tâche, jamais à l'intégralité d'un fichier.",
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
            alt="Vue éclatée d'une unité de calcul : processeur, refroidissement et châssis"
            width={513}
            height={675}
            className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px]"
          />
        </Reveal>
      </div>

    </section>
  );
}
