/* L'ornement du héros — verre irisé.
 *
 * La référence pose une pièce de verre translucide de 721×778 : un astérisque
 * à huit branches arrondies, une étoile à quatre pointes en son centre,
 * irisation pastel (menthe, bleu, lavande, rose). C'est son fichier : on ne le
 * reprend pas. Celui-ci est dessiné ici, à la même composition.
 *
 * Ce qui fait « verre » et non « filigrane » — trois erreurs corrigées après
 * l'avoir regardé en grand :
 *   1. UNE TEINTE PAR BRANCHE. Un seul dégradé diagonal sur l'ensemble pose
 *      ses extrêmes dans les coins vides, entre les branches : on n'en voit
 *      que le milieu, et la pièce devient monochrome.
 *   2. LE VOILE CLAIR RESTE AU CŒUR. À 0,7 d'opacité sur toute la pièce, il
 *      lavait l'irisation ; il ne fait plus qu'éclairer le centre.
 *   3. LES LISERÉS À L'ÉCHELLE. 2 unités de contour sur 800 disparaissent à
 *      l'écran : le liseré irisé fait 11, le blanc 5.
 */
export function Ornement({ className = "" }: { className?: string }) {
  const branches = [
    { angle: 0, fill: "url(#orn-p1)" },
    { angle: 45, fill: "url(#orn-p2)" },
    { angle: 90, fill: "url(#orn-p3)" },
    { angle: 135, fill: "url(#orn-p4)" },
  ];

  const etoile =
    "M400 232c14 94 34 133 68 160 26 20 62 31 110 35-94 14-133 34-160 68-20 26-31 62-35 110-14-94-34-133-68-160-26-20-62-31-110-35 94-14 133-34 160-68 20-26 31-62 35-110Z";

  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id="orn-p1" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#93d8b8" />
          <stop offset="50%" stopColor="#c6e6ef" />
          <stop offset="100%" stopColor="#b8b2f2" />
        </linearGradient>
        <linearGradient id="orn-p2" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#a6cbf6" />
          <stop offset="50%" stopColor="#d3e3f7" />
          <stop offset="100%" stopColor="#e9bce4" />
        </linearGradient>
        <linearGradient id="orn-p3" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#b6aff3" />
          <stop offset="50%" stopColor="#d8d3f5" />
          <stop offset="100%" stopColor="#93d8b8" />
        </linearGradient>
        <linearGradient id="orn-p4" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ecbbe3" />
          <stop offset="50%" stopColor="#dad4f6" />
          <stop offset="100%" stopColor="#a6cbf6" />
        </linearGradient>

        <linearGradient id="orn-liseret" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#8fd8b8" />
          <stop offset="34%" stopColor="#9cc7f4" />
          <stop offset="64%" stopColor="#b7aef2" />
          <stop offset="100%" stopColor="#eeb9e2" />
        </linearGradient>

        <radialGradient id="orn-coeur" cx="44%" cy="36%" r="52%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="orn-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e4e0fb" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#f1e9f6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#edf4ea" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="orn-etoile" x1="16%" y1="0%" x2="84%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="34%" stopColor="#dcebff" />
          <stop offset="68%" stopColor="#e3d9f9" />
          <stop offset="100%" stopColor="#ffd9ef" />
        </linearGradient>

        <filter id="orn-flou-fort" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="orn-flou-doux" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="orn-flou-fin" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        <g id="orn-contour">
          {branches.map((b) => (
            <rect
              key={b.angle}
              x="330"
              y="88"
              width="140"
              height="624"
              rx="70"
              transform={`rotate(${b.angle} 400 400)`}
            />
          ))}
        </g>
      </defs>

      <circle cx="400" cy="404" r="348" fill="url(#orn-halo)" />

      {/* Ombre portée */}
      <use href="#orn-contour" fill="#c3bbe6" opacity="0.5" transform="translate(8 20)" filter="url(#orn-flou-fort)" />

      {/* Les branches, chacune sa teinte */}
      {branches.map((b) => (
        <rect
          key={b.angle}
          x="330"
          y="88"
          width="140"
          height="624"
          rx="70"
          transform={`rotate(${b.angle} 400 400)`}
          fill={b.fill}
          opacity="0.78"
        />
      ))}

      {/* Le cœur, éclairé */}
      <circle cx="400" cy="400" r="210" fill="url(#orn-coeur)" />

      {/* Les liserés : l'épaisseur du verre */}
      <use href="#orn-contour" fill="none" stroke="url(#orn-liseret)" strokeWidth="11" filter="url(#orn-flou-fin)" />
      <use href="#orn-contour" fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.92" />
      <use
        href="#orn-contour"
        fill="none"
        stroke="#a9b6dd"
        strokeWidth="2"
        opacity="0.5"
        transform="translate(400 400) scale(0.982) translate(-400 -400)"
      />

      {/* Taches spéculaires : la lumière vient du haut à gauche */}
      <g filter="url(#orn-flou-doux)">
        <ellipse cx="336" cy="196" rx="46" ry="88" fill="#ffffff" opacity="0.9" transform="rotate(-16 336 196)" />
        <ellipse cx="228" cy="322" rx="80" ry="34" fill="#ffffff" opacity="0.7" transform="rotate(-10 228 322)" />
      </g>

      {/* L'étoile centrale */}
      <g>
        <circle cx="400" cy="404" r="118" fill="#ffffff" opacity="0.6" filter="url(#orn-flou-doux)" />
        <path d={etoile} fill="url(#orn-etoile)" />
        <path d={etoile} fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.95" />
        <path
          d={etoile}
          fill="none"
          stroke="#8ea3d4"
          strokeWidth="2.4"
          opacity="0.75"
          transform="translate(400 404) scale(0.965) translate(-400 -404)"
        />
      </g>
    </svg>
  );
}
