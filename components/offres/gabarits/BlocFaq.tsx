import type { Fiche } from "@/lib/fiches";

/* ══════════════════════════════════════════════════════════════════════
   Bloc FAQ — partagé par les trois gabarits · 13/08/2026

   Il n'existait que dans GabaritHome, en dur. Conséquence : RELOAD, FRONTD
   et FILED n'affichaient aucune question, alors que leurs fiches en
   portaient trois ou quatre chacune — une douzaine de réponses écrites que
   personne n'a jamais lues sur le site. Le balisage est repris tel quel de
   GabaritHome (carte de 800, titre 36/1,4, accordéons `o-faq-item`) pour
   que la section se lise à l'identique sur les six pages.

   Le chapô est optionnel : une fiche sans `sections.faqChapo` affiche le
   titre seul plutôt qu'une phrase générique interpolée.
   ══════════════════════════════════════════════════════════════════════ */

export default function BlocFaq({
  faq,
  chapo,
}: {
  faq: Fiche["faq"];
  chapo?: string;
}) {
  if (!faq.length) return null;

  return (
    <section className="o-wrap pb-[110px]">
      <div
        data-reveal
        className="o-card-plate mx-auto max-w-[800px] px-6 py-14 sm:px-[100px] sm:py-[76px]"
      >
        <h3 className="o-h4 text-center" style={{ fontSize: "36px", lineHeight: "1.4" }}>
          Questions directes
        </h3>
        {chapo ? <p className="o-body mt-2.5 text-center">{chapo}</p> : null}
        <div className={chapo ? "mt-9" : "mt-7"}>
          {faq.map((f) => (
            <details key={f.q} className="o-faq-item">
              <summary>
                {f.q}
                <span className="o-faq-croix" aria-hidden>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="o-body pb-6 pr-10">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
