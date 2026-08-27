/* ══════════════════════════════════════════════════════════════════════
   <Engagements> — « Ce qui est écrit noir sur blanc », bande claire.

   Refait le 04/08 (Teo : « trop amateur »). Le défaut de la version d'avant
   n'était pas seulement graphique, il était de NATURE : deux blocs gris
   avec une phrase entre guillemets et une légende dessous, c'est la forme
   exacte d'un témoignage client. Or ce n'en sont pas — ce sont des règles
   du protocole d'audit. La page imitait donc un témoignage sans en être
   un, et c'est précisément ce qui se lisait comme amateur : un lecteur
   cherche l'auteur, ne le trouve pas, et doute du reste.

   Le catalogue Testimonials de 21st.dev confirme le diagnostic par
   l'absurde — tous ses patterns tournent autour de l'avatar, du nom et de
   la société. Rien de tout ça ici. On sort donc du registre citation.

   Ce qui remplace : un DOCUMENT. Un panneau unique plutôt que deux cartes,
   un en-tête qui nomme la source, et des articles numérotés séparés par un
   filet — la forme d'un règlement affiché, ce que ces phrases sont
   réellement. Les guillemets sautent : on ne cite personne, on publie ce
   qu'on s'engage à tenir. C'est plus honnête et, accessoirement, bien plus
   distinctif qu'un faux témoignage de plus.
   ══════════════════════════════════════════════════════════════════════ */

const ARTICLES: { n: string; intitule: string; texte: string }[] = [
  {
    n: "01",
    intitule: "Chiffrage",
    texte:
      "Aucun audit ne se termine par une plaquette. Il se termine par un montant en euros ou en heures par mois, vérifiable dans vos propres documents.",
  },
  {
    n: "02",
    intitule: "Recommandation",
    texte:
      "Si le calcul ne justifie pas d'installer un moteur, la recommandation est de ne rien installer. C'est une conclusion valable, et elle arrive.",
  },
  {
    n: "03",
    intitule: "Confidentialité",
    texte:
      "Les chiffres que vous montrez pendant l'audit ne sortent pas de l'entretien. Ils ne servent ni d'exemple commercial, ni de référence auprès d'un autre client.",
  },
];

export default function Engagements() {
  return (
    <div
      data-reveal
      className="mt-10 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-[#ececec] bg-[#fafafa] px-7 py-5 sm:px-9">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#616161]">
          Protocole d&apos;audit
        </p>
        <p className="text-[13px] text-[#616161]">
          Appliqué à tous les formats, sans exception
        </p>
      </div>

      <ol>
        {ARTICLES.map((a) => (
          <li
            key={a.n}
            className="flex flex-col gap-4 border-b border-[#ececec] px-7 py-7 last:border-b-0 sm:flex-row sm:gap-9 sm:px-9 sm:py-8"
          >
            {/* Numéro + intitulé en colonne fixe : c'est ce qui donne au
                bloc sa lecture de règlement plutôt que de citation. */}
            <div className="flex shrink-0 items-baseline gap-3 sm:w-44 sm:flex-col sm:gap-1.5">
              <span className="font-mono text-[12px] text-[#a1a1a1]">{a.n}</span>
              <span className="text-[15px] font-medium text-[#050505]">{a.intitule}</span>
            </div>
            <p className="text-[16px] leading-[26px] text-[#3f3f3f] sm:text-[17px] sm:leading-[28px]">
              {a.texte}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
