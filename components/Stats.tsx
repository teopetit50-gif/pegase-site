import Reveal from "./Reveal";
import StatNumber from "./StatNumber";

const STATS = [
  {
    n: "187 M€",
    label: "d'impayés bloqués rien qu'en Guadeloupe",
    sub: "De la trésorerie immobilisée chez vos clients. Une relance systématique en récupère une part mesurable, chaque semaine.",
  },
  {
    n: "60 %",
    label: "des TPE antillaises n'ont pas de CRM",
    sub: "Inutile d'en acheter un : les moteurs s'installent sur le tableur et la messagerie déjà en place.",
  },
  {
    n: "01.09.2026",
    label: "facturation électronique obligatoire",
    sub: "L'obligation entre en vigueur pour toutes les entreprises — BILLD met votre facturation en conformité avant la date.",
  },
  {
    n: "80 %",
    label: "de l'installation financée par le Chèque TIC",
    sub: "Le dispositif régional couvre l'essentiel du coût d'installation pour les TPE éligibles de Guadeloupe.",
  },
];

export default function Stats() {
  return (
    <section className="border-b border-line-soft">
      <div className="px-6 pb-8 pt-8 sm:px-10 sm:pb-12 sm:pt-14">
        <Reveal>
          <h2 className="text-[27px] font-medium tracking-[-0.03em] text-white sm:text-[46px]">
            Pourquoi maintenant
          </h2>
        </Reveal>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, idx) => (
          <div
            key={s.n}
            className={[
              "px-6 pb-10 pt-6 sm:px-8 sm:pb-16 sm:pt-10",
              "border-line-soft transition-colors hover:bg-white/[0.02] sm:border-t",
              idx % 2 === 0 ? "sm:border-r" : "",
              idx % 4 !== 3 ? "lg:border-r" : "lg:border-r-0",
            ].join(" ")}
          >
            <Reveal delay={(idx % 4) * 100}>
              <StatNumber value={s.n} />
              <div className="mt-4 text-[15px] font-medium uppercase leading-snug tracking-[0.04em] text-white">
                {s.label}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.sub}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
