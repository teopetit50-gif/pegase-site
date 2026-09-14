import { CHIFFRES } from "@/lib/produits/relances";

/* Bande d'indicateurs, posée juste après le ruban d'outils.
   Le motif « Real-Time / Operations » du référentiel UI la place là : après
   le héros, avant l'explication. Elle porte la moitié du message sans une
   phrase de plus, et c'est ce qui allège le reste de la page.

   Quatre chiffres en Geist Mono, au même palier que le h1 du héros, sur
   une grille qui se sépare par des filets — même vocabulaire que la carte
   à trois colonnes de la section suivante.

   RAPATRIEMENT 11/09 — `text-muted-foreground` → `text-[#737373]`,
   `bg-border` → `bg-[#e6e6e6]`, `bg-card` → `bg-[#ffffff]`,
   `text-foreground` → `text-[#171717]`. `font-mono` est conservé tel quel
   mais REDÉFINI dans relances.css : sur ce site il vaut JetBrains Mono,
   le relevé demande Geist Mono. */
export function Chiffres() {
  return (
    <section id="chiffres" data-monde="clair" className="scroll-mt-24 pb-16 md:pb-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="mb-8 text-center font-mono text-[11px] text-[#737373] uppercase tracking-[0.2em]">
          {CHIFFRES.titre}
        </p>
        {/* Les filets viennent du fond de la grille (`gap-px` sur
            `bg-[#e6e6e6]`) plutôt que de `divide-*` : une seule règle vaut
            pour un, deux ou quatre par rangée, sans exception à écrire. */}
        <dl className="grid gap-px overflow-hidden rounded-2xl bg-[#e6e6e6] sm:grid-cols-2 lg:grid-cols-4">
          {CHIFFRES.liste.map((c) => (
            <div key={c.unite} className="flex flex-col gap-2 bg-[#ffffff] p-6 sm:p-8">
              <dt className="flex items-baseline gap-2">
                <span className="font-mono font-semibold text-4xl text-[#171717] tabular-nums lg:text-5xl">
                  {c.valeur}
                </span>
                <span className="font-medium text-[#737373] text-sm">{c.unite}</span>
              </dt>
              <dd className="text-[#737373] text-sm leading-relaxed">{c.texte}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
