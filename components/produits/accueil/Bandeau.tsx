import { BANDEAU } from "@/lib/produits/accueil";

/* Le ruban défile en 30 s linéaire sur trois copies identiques, la piste
   glissant de −33,33 % : la boucle est invisible. Valeurs relevées sur la
   keyframe `marquee` de la référence. Il s'arrête au survol. */
export function Bandeau() {
  const piste = (cle: string, cache: boolean) => (
    <div className="flex gap-16 pr-16 items-center" key={cle} aria-hidden={cache || undefined}>
      {BANDEAU.items.map((q, i) => (
        <span
          key={q + i}
          className="shrink-0 block h-8 leading-8 font-mono text-sm sm:text-base text-neutral-500 whitespace-nowrap"
        >
          {q}
        </span>
      ))}
    </div>
  );

  return (
    <section data-monde="clair" className="bg-white rounded-xl py-5 lg:py-10 px-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 md:gap-20 overflow-hidden">
          <div className="md:w-auto w-full text-center md:text-left shrink-0 z-10 relative pr-4">
            <p className="text-neutral-500 whitespace-nowrap">
              {BANDEAU.intro[0]}{" "}
              <strong className="text-neutral-900 font-medium">
                {BANDEAU.intro[1]}
                <br />
                {BANDEAU.intro[2]}
              </strong>
            </p>
          </div>
          <div className="relative flex-1 overflow-hidden w-full">
            <div className="flex a-marquee w-max hover:[animation-play-state:paused]">
              {piste("a", false)}
              {piste("b", true)}
              {piste("c", true)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
