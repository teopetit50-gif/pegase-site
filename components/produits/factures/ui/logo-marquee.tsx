/* ══════════════════════════════════════════════════════════════════════
   Le bandeau qui défile au bas du héros — relevé le 09/09/2026.

   Cadre : `absolute bottom-12`, largeur `calc(100%-2rem)` puis
   `calc(100%-3.5rem)` à lg, plafonnée à 1344px, avec un masque
   horizontal qui éteint les deux bords
   (`transparent, black 25%, black 75%, transparent`).
   Défilement : la piste est doublée et translatée de -50 % en 30 s
   linéaires, en boucle — c'est ce qui rend la boucle invisible.
   Gouttière relevée : 42px.

   CE QU'IL AFFICHE, ET POURQUOI. La référence aligne des logos de
   partenaires (Stripe, Vercel, GitHub…). FILED ne se connecte
   aujourd'hui qu'à une boîte mail : afficher un mur de logos
   d'intégrations reviendrait à promettre des branchements qui n'existent
   pas. Le bandeau porte donc ce qui est vrai et vérifiable — les formats
   et les canaux par lesquels une pièce arrive.

   Le composant accepte les deux : une chaîne devient un libellé, un nœud
   React devient un logo. Le jour où des intégrations existent, il n'y a
   que la liste de `lib/contenu.ts` à changer. */

export function LogoMarquee({
  items,
  secondes = 30,
}: {
  items: (string | React.ReactNode)[];
  secondes?: number;
}) {
  const piste = [...items, ...items];
  return (
    <div className="relative mx-auto w-[calc(100%-2rem)] max-w-[1344px] overflow-hidden lg:w-[calc(100%-3.5rem)]">
      {/* Bords éteints par deux dégradés, pas par un masque : un masque
          compositerait toute la piste et crénellerait les étiquettes.
          11/09 — les deux voiles passent du noir au BLANC : ils éteignent
          la piste en la fondant dans le fond, quel que soit ce fond. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-white to-transparent" />
      <div className="overflow-hidden">
        <div
          className="marquee flex w-max items-center"
          style={{ gap: "42px", animationDuration: `${secondes}s` }}
        >
          {piste.map((it, i) => (
            <span
              key={i}
              className="pointer-events-none select-none font-mono text-[11px] uppercase tracking-[0.18em] text-[#171717] opacity-70 md:text-[12px]"
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
