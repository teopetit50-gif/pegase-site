import FormulaireFormat from "@/app/reserver-un-audit/FormulaireFormat";
import { FORMATS } from "@/lib/demande-audit";
import { MARQUE_SITE } from "@/components/espace2/portail";
import "@/app/reserver-un-audit/reserver.css";

/* ══════════════════════════════════════════════════════════════════════
   La section « Réserver un audit » d'un site dédié (10/11/2026)

   Teo : « je veux pas qu'il y ait de page d'audit, ça doit être juste un
   site vitrine sans page pour la partie audit : tu dois faire la section
   (prix en audit) et mettre un composant pour remplir le truc d'audit
   dans la page directement ». La page /reserver-un-audit d'Omega n'existe
   plus sur un site dédié (next.config.ts la renvoie ici) : sa tête —
   les trois formats avec leurs conditions, et le formulaire qui bloque le
   créneau (FormulaireFormat, la même mécanique que /reserver) — devient la
   dernière section de la page, `#audit`, où mènent tous les boutons
   « Réserver un audit » (LIEN_AUDIT, components/espace2/portail.ts).
   Rendue par components/secteurs/SeCombine.tsx, à la place du bloc
   « Se combine avec » d'Omega. Styles : ceux de la page d'audit (reserver.css,
   sous `.rdv`), composés en deux colonnes : les formats à gauche, le
   formulaire dans une carte à droite.
   ══════════════════════════════════════════════════════════════════════ */
export default function SectionAudit() {
  if (!MARQUE_SITE) return null;
  return (
    <section id="audit" data-monde="clair" className="rdv scroll-mt-16 sm:scroll-mt-[72px]" aria-labelledby="audit-titre">
      <div className="rdv-section">
        <div className="rdv-wrap">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:gap-16">
            <div className="min-w-0">
              <h2 id="audit-titre" className="rdv-h1">
                Réserver un audit
              </h2>
              <p className="rdv-lead">
                Trois formats, gratuits à partir du cadrage de 45 minutes, pour mesurer ce que votre processus le plus coûteux représente. Nous
                chiffrons avant de recommander, jamais l&apos;inverse.
              </p>
              <ul className="mt-10 divide-y divide-black/10 border-y border-black/10">
                {FORMATS.map((f) => (
                  <li key={f.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                    <div>
                      <p className="text-[17px] font-medium" style={{ color: "var(--rdv-ink)" }}>
                        {f.nom}
                      </p>
                      <p className="mt-1 text-[15px] leading-[1.5]" style={{ color: "var(--rdv-texte)" }}>
                        {f.promesse}
                      </p>
                    </div>
                    <div className="rdv-mono text-[13px] sm:text-right" style={{ color: "var(--rdv-texte)" }}>
                      <p>
                        {f.duree}
                        {f.suffixe ? ` · ${f.suffixe}` : ""}
                      </p>
                      <p className="mt-1" style={{ color: "var(--rdv-ink)" }}>
                        {f.conditions}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-[16px] border border-black/10 bg-white p-5 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)] sm:p-8">
              <FormulaireFormat />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
