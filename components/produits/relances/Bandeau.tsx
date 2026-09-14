import { OUTILS } from "@/lib/produits/relances";

/* Le fondu latéral est donné en pixels, pas en pourcentage : à 8 % il vaut
   115 px à 1440 et 30 à 375, où les mots se coupaient net. */
const MASQUE =
  "linear-gradient(to right, transparent, black 72px, black calc(100% - 72px), transparent)";

/* ÉCART ASSUMÉ — le ruban ne s'affiche qu'à partir de `sm`. Sur un
   téléphone il ne montre que trois noms à la fois, et ce qu'il dit est
   déjà dit deux fois plus bas : par la bande de chiffres (« 1 tableur —
   celui que vous tenez déjà ») et par la colonne « S'installe sur » du
   pied. Sur grand écran il tient son rôle de respiration après le héros.

   RAPATRIEMENT 11/09 — `text-muted-foreground` → `text-[#737373]`,
   `text-foreground/35` → `text-[#171717]/35`, et `animate-ruban` →
   `rel-animate-ruban` (la classe et son `@keyframes` sont préfixés dans
   relances.css : les keyframes sont globaux, ils ne se scopent pas). */
function Ruban({ inverse = false }: { inverse?: boolean }) {
  const triple = [...OUTILS.liste, ...OUTILS.liste, ...OUTILS.liste];
  return (
    <div className="overflow-hidden py-4" style={{ maskImage: MASQUE, WebkitMaskImage: MASQUE }}>
      <div
        className="flex w-max rel-animate-ruban items-center"
        style={{ animationDirection: inverse ? "reverse" : "normal" }}
      >
        {triple.map((nom, i) => (
          <div
            key={`${nom}-${i}`}
            className="flex shrink-0 items-center justify-center pl-14 sm:pl-16"
          >
            <span className="inline-flex items-center whitespace-nowrap font-semibold text-2xl text-[#171717]/35 tracking-tight">
              {nom}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bandeau() {
  return (
    <section
      id="outils"
      data-monde="clair"
      className="hidden scroll-mt-24 py-16 sm:block md:py-24"
    >
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-8 text-center font-medium text-[#737373] text-sm uppercase tracking-wider">
          {OUTILS.titre}
        </p>
        <div className="space-y-2">
          <Ruban />
          <Ruban inverse />
        </div>
      </div>
    </section>
  );
}
