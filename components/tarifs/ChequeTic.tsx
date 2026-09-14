/* ══════════════════════════════════════════════════════════════════════
   ChequeTic — le Chèque TIC en trois tuiles à grands chiffres (14/09/2026)

   Reprise de `stats-2` de @designali-in (21st.dev) : trois tuiles de même
   hauteur, un libellé discret en tête, un grand chiffre en pied avec sa
   phrase — puis un titre et un bouton. L'original met les tuiles AVANT le
   titre ; ici le titre vient d'abord, parce que la bande dit ce qu'est le
   dispositif avant d'en donner les chiffres.

   Remplace le bloc texte + bouton qui occupait la bande sombre : le seul
   contenu visuel de la section était un titre de 56 px, et l'essentiel —
   40 à 80 %, 10 000 € — se lisait dans un paragraphe de quatre lignes.

   Écarts avec l'original :

   1. `bg-secondary`, `text-muted-foreground`, `text-foreground/80` sont des
      jetons shadcn qui n'existent pas ici : les tuiles sont peintes en
      blanc très dilué sur la bande `.r-nuit`, avec un filet `white/12`
      posé explicitement (Tailwind v4 peint `border` seul en currentColor).
   2. Le bouton est celui du site (`r-btn r-btn--blanc`), pas celui de
      shadcn ; le bloc « avis Google ★ » est supprimé, la maison n'affiche
      pas de preuve sociale inventée.
   3. `h-60` fixe est remplacé par `min-h-[240px]` à partir de `sm`, et
      rien en dessous : trois tuiles empilées à 390 n'ont pas à réserver
      de vide. La phrase sous le chiffre a une hauteur plancher de deux
      lignes (`sm:min-h-[44px]`) pour que les trois chiffres restent sur
      une même ligne quand une seule phrase se replie.
   4. `@aliimam/icons` n'est pas installé, aucune icône n'est nécessaire.

   Les trois chiffres redisent des faits déjà posés sur la page (texte de la
   bande et FAQ « Le Chèque TIC s'applique-t-il ici ? ») — rien d'ajouté.
   La mention « Région Guadeloupe » reste : aide régionale sur un site
   national, l'incise est obligatoire.
   ══════════════════════════════════════════════════════════════════════ */

const TUILES: { libelle: string; chiffre: string; phrase: string }[] = [
  {
    libelle: "Part financée",
    chiffre: "40 à 80 %",
    phrase: "du projet de transformation numérique",
  },
  {
    libelle: "Plafond de l'aide",
    chiffre: "10 000 €",
    phrase: "pour une entreprise éligible",
  },
  {
    libelle: "Sur l'abonnement",
    chiffre: "0 €",
    phrase: "le dispositif porte sur l'installation, pas sur le mensuel",
  },
];

export default function ChequeTic() {
  return (
    <div className="r-wrap py-14 sm:py-20">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[60ch]">
          <p className="r-note">Chèque TIC — Région Guadeloupe</p>
          <h2 className="r-h2 mt-6 max-w-[18ch]">
            De 40 à 80&nbsp;% d&apos;un projet numérique financés
          </h2>
          <p className="mt-5 text-[15px] leading-[24px] text-[#d4d4d8]">
            Votre éligibilité est vérifiée à la réunion d&apos;installation, et si un dossier se justifie, nous le montons avec vous.
          </p>
        </div>
        <a href="#grille" className="r-btn r-btn--blanc shrink-0">
          Choisir mes postes
        </a>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {TUILES.map((t) => (
          <div
            key={t.libelle}
            data-reveal
            className="flex flex-col justify-between gap-8 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-6 sm:min-h-[240px]"
          >
            <p className="text-[13px] leading-5 text-[#a1a1aa]">{t.libelle}</p>
            <div>
              <p
                className="font-[family-name:var(--font-jakarta)] text-[44px] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[52px] lg:text-[60px]"
                aria-label={t.chiffre}
              >
                {t.chiffre}
              </p>
              <p className="mt-3 text-[15px] leading-[22px] text-white/80 sm:min-h-[44px]">{t.phrase}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
