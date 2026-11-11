/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — le bloc sombre (11/11/2026)

   La section « Security & Privacy » du modèle : fond #0a0a0a, filet haut
   blanc à 10 %, douze colonnes (sept / huit à gauche : amorce à 50 %,
   titre blanc, chapô à 60 % sur 42rem ; cinq / quatre à droite : deux
   sceaux de 160 px, alignés à droite dès `md`). Les deux sceaux du
   modèle (AICPA SOC, SSO SAML — des certifications que Tamila n'a pas)
   deviennent deux sceaux dessinés en SVG, aux mêmes 160 px : l'hébergement
   en France et l'article 66-5 (SOUVERAINETE, radius.ts). Les mots : le
   badge et l'accroche de SECRET (textes.ts) ; les cinq faits en liste
   sous le chapô, et la mention en pied — deux lignes que le dessin
   n'avait pas, gardées pour ne perdre aucun mot de la page du 24/09.
   ══════════════════════════════════════════════════════════════════════ */
import { useId } from "react";
import { AMORCES, SOUVERAINETE } from "./radius";
import { Conteneur } from "./ui";

function Sceau({ ligne1, ligne2, tour }: { ligne1: string; ligne2: string; tour: string }) {
  const id = useId();
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full" role="img" aria-label={`${ligne1} ${ligne2} — ${tour}`}>
        <defs>
          <radialGradient id={`${id}-f`} cx="50%" cy="40%" r="65%">
            <stop offset="0" stopColor="#262626" />
            <stop offset="1" stopColor="#0d0d0d" />
          </radialGradient>
          <path id={`${id}-c`} d="M80,80 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0" />
        </defs>
        <circle cx="80" cy="80" r="76" fill={`url(#${id}-f)`} stroke="#3a3a3a" strokeWidth="1.5" />
        <circle cx="80" cy="80" r="66" fill="none" stroke="#4a4a4a" strokeWidth="1" />
        <circle cx="80" cy="80" r="46" fill="none" stroke="#333" strokeWidth="1" />
        <text fill="#9a9a9a" fontSize="7.5" fontWeight="500" letterSpacing="1.2" style={{ textTransform: "uppercase" }}>
          <textPath href={`#${id}-c`} startOffset="0">
            {tour.toUpperCase()} ·
          </textPath>
        </text>
        <text x="80" y="76" textAnchor="middle" fill="#f0f0f0" fontSize="15" fontWeight="600">
          {ligne1}
        </text>
        <text x="80" y="95" textAnchor="middle" fill="#d0d0d0" fontSize="12" fontWeight="500">
          {ligne2}
        </text>
      </svg>
    </div>
  );
}

export default function Souverainete() {
  return (
    <section id="souverainete" className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0a] py-16 sm:scroll-mt-[72px] sm:py-20 md:py-24 lg:py-28" aria-labelledby="souverainete-titre">
      <Conteneur>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
          <div className="md:col-span-7 lg:col-span-8">
            <header className="flex flex-col gap-4">
              <p className="text-sm font-normal text-white/50 sm:text-base">{AMORCES.souverainete}</p>
              <h2 id="souverainete-titre" className="text-2xl font-normal leading-[1.2] tracking-[-0.015em] text-white sm:text-3xl md:text-4xl lg:text-[2.4rem]">
                {SOUVERAINETE.titre}
              </h2>
              <p className="max-w-2xl text-sm leading-normal text-white/60 sm:text-base">{SOUVERAINETE.texte}</p>
            </header>
            <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {SOUVERAINETE.faits.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2">
                  <dt className="text-white/50">{k}</dt>
                  <dd className="text-right text-white/85">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs leading-normal text-white/40">{SOUVERAINETE.mention}</p>
          </div>
          <div className="md:col-span-5 lg:col-span-4">
            <div className="flex items-center justify-start gap-6 md:justify-end lg:gap-8">
              {SOUVERAINETE.sceaux.map((s) => (
                <Sceau key={s.ligne1} {...s} />
              ))}
            </div>
          </div>
        </div>
      </Conteneur>
    </section>
  );
}
