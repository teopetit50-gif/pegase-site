import Link from "next/link";
import Reveal from "./Reveal";

/* « Travailler avec nous » — v3 MANIFESTE (21/07) : refonte complète après
   rejet des rangées éditoriales. Colonne gauche sticky (label, titre, CTA),
   colonne droite = 4 déclarations en très grande typographie à double
   intensité (l'essentiel en encre pleine, la suite estompée), chacune
   portée par une ligne de détail. Aucune carte, aucun gadget — que du
   texte, de l'espace et un filet d'entrée. Faits existants uniquement. */

const DECLARATIONS: {
  n: string;
  fort: string;
  suite: string;
  detail: string;
}[] = [
  {
    n: "01",
    fort: "Un audit de trente minutes.",
    suite: "Un diagnostic chiffré.",
    detail:
      "Nous mesurons ce que votre difficulté principale vous coûte réellement (encours d'impayés, demandes restées sans réponse, heures de saisie), puis nous désignons le moteur au meilleur retour. Le chiffre est vérifiable dans vos propres documents, et il précède toujours le devis.",
  },
  {
    n: "02",
    fort: "Un moteur à la fois.",
    suite: "Le plus rentable d'abord.",
    detail:
      "Le premier moteur se branche sur vos outils existants (messagerie, tableur, WhatsApp), et son retour se lit dès les premières semaines. Le deuxième ne s'installe qu'une fois le premier rentable, jamais dans le même devis.",
  },
  {
    n: "03",
    fort: "Rien ne part sans vous.",
    suite: "Aussi longtemps que vous voulez.",
    detail:
      "Tout message destiné à un client passe par une file de validation : vous approuvez, corrigez ou suspendez d'un clic. Vos données vivent par ailleurs dans un espace dédié à votre entreprise, chiffré et strictement séparé de celui des autres clients.",
  },
  {
    n: "04",
    fort: "Le tarif découle du gain.",
    suite: "Jamais l'inverse.",
    detail:
      "Le montant d'un moteur est posé en regard de ce qu'il récupère ou fait économiser sur un mois. Si le calcul ne tient pas, la recommandation est de ne rien installer, et cette conclusion arrive.",
  },
];

export default function Working() {
  return (
    <section id="audit" data-monde="clair" className="monde-clair">
      <div className="grid gap-12 px-6 py-14 sm:px-10 sm:py-24 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
        {/* colonne gauche — sticky : le cadre reste pendant qu'on lit */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <div className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-black/50">
              <span aria-hidden className="h-1.5 w-1.5 rounded-[2px] bg-gold" />
              Comment on travaille
            </div>
            <h2 className="mt-5 text-[28px] font-bold leading-[1.08] tracking-[-0.025em] text-[#0f1013] sm:text-[44px]">
              Quatre règles.
              <br />
              Aucune exception.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#52555c] sm:text-base">
              La méthode est la même pour un garage, un cabinet ou un
              restaurant, et elle commence toujours par un chiffrage, jamais
              par un devis.
            </p>
            <Link
              href="/commencer"
              className="mt-8 inline-block rounded-[var(--radius-btn)] bg-black px-7 py-3.5 text-[16px] font-semibold text-[#f4f1ec] transition hover:bg-black/85 active:scale-[0.97] shadow-[0_0_46px_-2px_rgba(15,16,19,0.55),0_14px_30px_-8px_rgba(15,16,19,0.42)]"
            >
              Commencer
            </Link>
          </Reveal>
        </div>

        {/* colonne droite — les 4 déclarations, grande typographie */}
        <div>
          {DECLARATIONS.map((d, i) => (
            <Reveal key={d.n} delay={i * 90}>
              <div className={i > 0 ? "mt-14 sm:mt-20" : ""}>
                <div className="num text-[13px] font-semibold" style={{ color: "#8a6519" }}>
                  {d.n}
                </div>
                <p className="mt-3 max-w-2xl text-[26px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[38px]">
                  <span className="text-[#0f1013]">{d.fort}</span>{" "}
                  <span className="text-black/30">{d.suite}</span>
                </p>
                <p className="mt-4 max-w-xl text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
                  {d.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
