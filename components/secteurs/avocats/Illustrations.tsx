/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Illustrations.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   illustrations.tsx`. Mêmes dessins, MÊMES FORMATS (ce sont eux qui fixent
   la hauteur des cartes), mêmes textes d'exemple. Seules les couleurs
   changent.

   MONDE BLANC — les cinq dessins étaient des maquettes SOMBRES (panneaux
   #0f0f10 à #171717, traits #262626, textes #fafafa) : ils passent en
   entier dans le thème clair, aucune ne reste noire dans sa carte blanche.
     panneaux → #ffffff (au premier plan) ou #fafafa (le fond d'une pile,
       le cadre du bordereau : « un cran sous la carte », comme la source
       les posait un cran au-dessus du noir) ;
     trait #262626 → #e5e5e5 · barres de texte #262626 / #404040 →
       #ececec / #d4d4d4 · tirets #525252 / #404040 → #d4d4d4 ;
     textes #fafafa → #171717 · #a3a3a3 → #737373 · #737373 inchangé ;
     accents « clairs sur le noir » → leur version foncée : bleu-300 →
       bleu-600, rose-300 → rose-600, ambre-400 → ambre-600 / 700 ;
     voiles bleu / rose 14 et 12 % → 10 et 9 % (un voile coloré pèse plus
       sur le blanc) ;
     l'ombre portée de la notification, noire à 60 % (invisible sur le
       noir), → ardoise à 8 % : elle détache la carte sans la salir ;
     la courbe de la chronologie partait d'une teinte fondue dans le noir
       (#1e293b) pour finir presque blanche (#e5e5e5) — le fait récent le
       plus lumineux. Le sens s'inverse : elle part fondue dans le blanc
       (bleu-100) et finit la plus foncée (bleu-900) ;
     le liseré du drapeau, blanc à 25 %, → encre #09090b à 22 % (celui du
       drapeau du site) : sans lui la bande blanche disparaît.
   Le bleu #3b82f6 de la marque ne change pas.
   Police : `var(--font-heading)` (Satoshi) → `var(--font-jakarta)`, la
   police de titre du site (règle 5). Identifiants préfixés `avocats-`.
   ══════════════════════════════════════════════════════════════════════ */

/* Illustrations des cinq cartes « fonctionnalités ». La référence y pose cinq SVG maison (feature-one…five),
   son actif : on ne les recopie pas. On les redessine au même poids et au MÊME FORMAT — c'est le format qui
   fixe la hauteur des cartes (une fois ses images chargées, la référence les affiche à leur ratio naturel :
   1381×817, 918×533, 604×398, 1126×422, 560×474 ; rangées de 355 et 416 px à 1440). */

/* 24/09 au soir (registre d'un cabinet, avocats.css) : le bleu #3b82f6 devient le vert de Tamila. Le nom
   `bleu` reste pour ne pas réécrire chaque dessin. */
const bleu = "#193a29";
const trait = "#e5e5e5";
const texte = "#737373";

const Cadre = ({ w, h, label, children }: { w: number; h: number; label: string; children: React.ReactNode }) => (
  <svg
    viewBox={`0 0 500 ${Math.round((500 * h) / w)}`}
    width={w}
    height={h}
    className="block w-full h-auto"
    role="img"
    aria-label={label}
    style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" }}
  >
    {children}
  </svg>
);

/* 1 — Pièces du jour : pile de notifications (format de feature-two, 1381 × 817 → 500 × 296) */
export function IllusPieces() {
  return (
    <Cadre w={1381} h={817} label="Notification : pièce adverse n° 23 reçue aujourd'hui à 10 h 25">
      <defs>
        <filter id="avocats-ombre-pieces" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0f172a" floodOpacity=".08" />
        </filter>
      </defs>
      <g opacity=".45">
        <rect x="84" y="16" width="332" height="96" rx="24" fill="#fafafa" stroke={trait} />
        <rect x="108" y="32" width="112" height="24" rx="12" fill="#f0f0f0" />
        <circle cx="240" cy="44" r="5.5" fill="#a3a3a3" />
        <text x="252" y="49" fill="#a3a3a3" fontSize="14" letterSpacing="1">À VÉRIFIER</text>
      </g>
      <g filter="url(#avocats-ombre-pieces)">
        <rect x="56" y="62" width="388" height="140" rx="28" fill="#ffffff" stroke={trait} />
      </g>
      <rect x="80" y="86" width="92" height="92" rx="19" fill="#f4f4f5" />
      <g transform="translate(102 108) scale(2)" fill="none" stroke={bleu} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </g>
      <circle cx="198" cy="107" r="6.5" fill={bleu} />
      <text x="211" y="113" fill={bleu} fontSize="16" letterSpacing="1">NOUVELLE</text>
      <text x="190" y="148" fill="#171717" fontSize="25" fontWeight="500">Pièce adverse n° 23</text>
      <text x="190" y="174" fill="#737373" fontSize="16">Aujourd&apos;hui, 10 h 25</text>
      {[232, 256, 280].map((y, i) => (
        <line key={y} x1={110 + i * 18} x2="444" y1={y} y2={y} stroke="#d4d4d4" strokeWidth="2" strokeDasharray="8 7" />
      ))}
    </Cadre>
  );
}

/* 2 — Chronologie (format de feature-one, 918 × 533 → 500 × 290). 24/09 au soir : la courbe sur un axe de mois
   faisait graphique de ventes ; c'est maintenant une frise de faits datés, comme celle d'un dossier de plaidoirie,
   le constat du 12 mai mis en avant avec sa pièce et sa page. */
const evenements = [
  { x: 40, d: "12 janv." },
  { x: 118, d: "3 févr." },
  { x: 196, d: "28 févr." },
  { x: 274, d: "14 mars" },
  { x: 368, d: "12 mai", actif: true },
  { x: 452, d: "2 juin" },
];

export function IllusChronologie() {
  return (
    <Cadre w={918} h={533} label="Chronologie : les faits datés d'un dossier, le constat du 12 mai mis en avant (pièce n° 9, page 4)">
      <line x1="16" x2="484" y1="168" y2="168" stroke="#d4d4d4" strokeWidth="2" />
      {evenements.map((e) => (
        <g key={e.x}>
          {e.actif ? (
            <>
              <line x1={e.x} x2={e.x} y1="118" y2="168" stroke={bleu} strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx={e.x} cy="168" r="17" fill={bleu} fillOpacity=".12" />
              <circle cx={e.x} cy="168" r="8" fill={bleu} />
            </>
          ) : (
            <circle cx={e.x} cy="168" r="6" fill="#ffffff" stroke="#a3a3a3" strokeWidth="2" />
          )}
          <text x={e.x} y="206" textAnchor="middle" fill={e.actif ? "#171717" : texte} fontSize="15" fontWeight={e.actif ? 500 : 400}>{e.d}</text>
          <rect x={e.x - 26} y="220" width="52" height="7" rx="3.5" fill={e.actif ? "#d4d4d4" : "#ececec"} />
          <rect x={e.x - 18} y="234" width="36" height="7" rx="3.5" fill="#ececec" />
        </g>
      ))}
      <g transform="translate(236 28)">
        <rect width="248" height="90" rx="14" fill="#ffffff" stroke={trait} />
        <text x="18" y="32" fill="#171717" fontSize="17" fontWeight="500">Constat du 12 mai 2026</text>
        <text x="18" y="54" fill={texte} fontSize="13.5">Commissaire de justice</text>
        <text x="18" y="75" fill={bleu} fontSize="13.5" fontWeight="500">Pièce n° 9, page 4</text>
      </g>
      <g opacity=".5">
        <rect x="16" y="52" width="170" height="54" rx="12" fill="#fafafa" stroke={trait} />
        <rect x="32" y="68" width="96" height="8" rx="4" fill="#e5e5e5" />
        <rect x="32" y="84" width="130" height="8" rx="4" fill="#ececec" />
      </g>
    </Cadre>
  );
}

/* 3 — Bordereau vérifié : les pièces du bordereau et leur contrôle (format de feature-three, 604 × 398 → 500 × 329) */
export function IllusBordereau() {
  const lignes = [
    { n: "Pièce 1 — Contrat de bail", ok: true },
    { n: "Pièce 7 — Constat", ok: true },
    { n: "Pièce 12 — jamais citée", ok: false },
  ];
  return (
    <Cadre w={604} h={398} label="Bordereau : deux pièces conformes, une pièce jamais citée dans les conclusions">
      <rect x="30" y="18" width="440" height="293" rx="22" fill="#fafafa" stroke={trait} />
      {lignes.map((l, i) => {
        const y = 78 + i * 88;
        return (
          <g key={l.n}>
            <circle cx="92" cy={y} r="25" fill={l.ok ? bleu : "#fef3c7"} />
            {l.ok ? (
              <path d={`M80 ${y} l8 8 l16 -16`} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <g stroke="#d97706" strokeWidth="3.5" strokeLinecap="round"><line x1="92" x2="92" y1={y - 11} y2={y + 3} /><line x1="92" x2="92" y1={y + 11} y2={y + 11} /></g>
            )}
            <text x="138" y={y - 6} fill={l.ok ? "#171717" : "#b45309"} fontSize="20" fontWeight="500">{l.n}</text>
            <rect x="138" y={y + 11} width="290" height="9" rx="4.5" fill="#ececec" />
            {l.ok && <rect x="138" y={y + 11} width={i ? 160 : 224} height="9" rx="4.5" fill="#d4d4d4" />}
          </g>
        );
      })}
    </Cadre>
  );
}

/* 4 — Contradictions : deux sources côte à côte (format de feature-four, 1126 × 422 → 500 × 187) */
/* Un panneau de source (hors du composant : un composant déclaré pendant le rendu serait recréé à chaque rendu,
   react-hooks/static-components). */
const Panneau = ({ x, source, page, date, actif }: { x: number; source: string; page: string; date: string; actif?: boolean }) => (
  <g transform={`translate(${x} 12)`}>
    <rect width="206" height="163" rx="14" fill="#ffffff" stroke={actif ? "url(#avocats-liseré-contra)" : trait} strokeWidth={actif ? 1.5 : 1} />
    <text x="16" y="28" fill="#171717" fontSize="13" fontWeight="500">{source}</text>
    <text x="16" y="45" fill="#737373" fontSize="10.5">{page}</text>
    {[60, 74].map((y, i) => <rect key={y} x="16" y={y} width={i ? 120 : 172} height="6" rx="3" fill="#ececec" />)}
    <rect x="10" y="88" width="186" height="38" rx="8" fill={actif ? "rgba(25,58,41,.08)" : "rgba(244,63,94,.09)"} />
    <text x="20" y="104" fill="#737373" fontSize="10">remise des clés</text>
    <text x="20" y="119" fill={actif ? "#193a29" : "#e11d48"} fontSize="13" fontWeight="500">{date}</text>
    {[138, 150].map((y, i) => <rect key={y} x="16" y={y} width={i ? 140 : 172} height="6" rx="3" fill="#ececec" />)}
  </g>
);

export function IllusContradictions() {
  return (
    <Cadre w={1126} h={422} label="Contradiction : la pièce 7 date la remise des clés au 12 mars, la pièce 15 au 21 mars">
      <defs>
        <linearGradient id="avocats-liseré-contra" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7a62" />
          <stop offset="1" stopColor={bleu} />
        </linearGradient>
      </defs>
      <Panneau x={24} source="Pièce 7 — Constat" page="page 3" date="12 mars 2026" actif />
      <Panneau x={270} source="Pièce 15 — Courriel" page="page 1" date="21 mars 2026" />
      <g transform="translate(250 94)">
        <circle r="19" fill="#ffffff" stroke={trait} />
        <path d="M-7 -3.5 h14 M-7 3.5 h14" stroke="#171717" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M5.5 -9 L-5.5 9" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </Cadre>
  );
}

/* 5 — Secret professionnel : grille de pièces, une scellée et une vérifiée (format de feature-five, 560 × 474 → 500 × 423) */
export function IllusSecret() {
  return (
    <Cadre w={560} h={474} label="Éditeur français : pièces chiffrées, lecture décidée dossier par dossier">
      {[
        [30, 20, 90, 60], [140, 10, 130, 70], [290, 20, 90, 60], [400, 10, 80, 70],
        [30, 100, 90, 150], [140, 100, 130, 150], [290, 100, 90, 150], [400, 100, 80, 150],
        [30, 270, 90, 90], [140, 270, 130, 70], [290, 270, 90, 90], [400, 270, 80, 70],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="14" fill="none" stroke={i === 5 ? "#a3a3a3" : trait} />
      ))}
      {/* le drapeau (teintes officielles #000091 / #E1000F) dans la case centrale, cadenas en sceau */}
      <g transform="translate(160 130)">
        <rect x="-1" y="-1" width="92" height="62" rx="5" fill="none" stroke="#09090b" strokeOpacity=".22" />
        <rect width="30" height="60" rx="4" fill="#000091" />
        <rect x="22" width="8" height="60" fill="#000091" />
        <rect x="30" width="30" height="60" fill="#fff" />
        <rect x="60" width="30" height="60" rx="4" fill="#E1000F" />
        <rect x="60" width="8" height="60" fill="#E1000F" />
        <text x="0" y="92" fill="#737373" fontSize="13">Éditeur français</text>
      </g>
      <circle cx="335" cy="175" r="25" fill="#f5f5f5" />
      <g transform="translate(323 162)" fill="none" stroke="#171717" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="12" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </g>
      <g transform="translate(205 320)">
        <circle r="23" fill="#ffffff" stroke="#d4d4d4" />
        <path d="M-9 0 l6 6 l12 -12" fill="none" stroke="#171717" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Cadre>
  );
}
