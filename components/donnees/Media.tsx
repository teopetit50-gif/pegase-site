/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — les grands dessins (08/08/2026)

   Trois pièces que la référence (scale.com/global-public-sector) remplit
   avec des captures de son produit :

   • `SchemaTrajet`  — le cercle au trait de leur carte bleue (« Iterative
     Engineering Lifecycle »). Ici : le trajet d'une donnée, de votre boîte
     à la base et retour.
   • `MaquetteOutil` / `MaquetteMoteur` / `MaquetteBase` — les trois
     vignettes du bloc gris. Ce sont des captures produit chez Scale ; on
     ne peut évidemment pas reprendre les leurs, et le cockpit Omega n'a pas
     de capture publiable. Elles sont donc DESSINÉES : mêmes proportions,
     même gris, même effet d'écran tronqué en bas de vignette.

   Tout est en SVG à `currentColor` ou en gris fixes : aucune image à
   charger, rien à re-exporter le jour où une couleur bouge.
   ══════════════════════════════════════════════════════════════════════ */

type P = { className?: string };

/* ——— le cercle du trajet d'une donnée ———
   Cinq étapes autour d'un cercle, un libellé au centre. Les arcs sont tracés
   avec une flèche à leur extrémité pour donner le sens de rotation. */
export function SchemaTrajet({ className }: P) {
  const etapes = [
    { a: -90, l: ["Votre boîte", "mail"] },
    { a: -18, l: ["Le moteur", "lit le champ"] },
    { a: 54, l: ["Le modèle", "rédige"] },
    { a: 126, l: ["Vous", "validez"] },
    { a: 198, l: ["La base", "à Francfort"] },
  ];
  const cx = 300;
  const cy = 210;
  const r = 132;
  const pos = (a: number, rayon: number) => {
    const t = (a * Math.PI) / 180;
    return [cx + rayon * Math.cos(t), cy + rayon * Math.sin(t)];
  };

  return (
    <svg viewBox="0 0 600 420" fill="none" aria-hidden className={className}>
      {/* Les arcs entre étapes, laissés ouverts autour de chaque point.
          `pathLength={1}` normalise la longueur de chaque arc : le tracé
          progressif se règle alors en CSS par un dashoffset de 1 → 0, sans
          avoir à mesurer quoi que ce soit au montage. */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.9">
        {etapes.map((e, i) => {
          const suivant = etapes[(i + 1) % etapes.length].a;
          const d1 = e.a + 13;
          const d2 = (suivant < e.a ? suivant + 360 : suivant) - 13;
          const [x1, y1] = pos(d1, r);
          const [x2, y2] = pos(d2, r);
          return (
            <path
              key={i}
              className="vd-trace"
              style={{ "--i": i } as React.CSSProperties}
              pathLength={1}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* les pointes de flèche, une par arc, posées juste avant l'étape suivante */}
      <g fill="currentColor">
        {etapes.map((e, i) => {
          const suivant = etapes[(i + 1) % etapes.length].a;
          const d = (suivant < e.a ? suivant + 360 : suivant) - 13;
          const [x, y] = pos(d, r);
          return (
            <polygon
              key={i}
              className="vd-pointe"
              style={{ "--i": i } as React.CSSProperties}
              points="0,-3.4 6.4,0 0,3.4"
              transform={`translate(${x} ${y}) rotate(${d + 90})`}
            />
          );
        })}
      </g>

      {/* le libellé central */}
      <g
        className="vd-ap"
        style={{ "--i": 9 } as React.CSSProperties}
        fill="currentColor"
        textAnchor="middle"
        fontSize="13"
      >
        <circle cx={cx} cy={cy} r="46" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x={cx} y={cy - 5}>
          Le trajet
        </text>
        <text x={cx} y={cy + 13}>
          d&apos;une donnée
        </text>
      </g>

      {/* les cinq étapes */}
      <g fill="currentColor" textAnchor="middle" fontSize="12.5">
        {etapes.map((e, i) => {
          const [x, y] = pos(e.a, r + 34);
          return (
            <g key={i} className="vd-ap" style={{ "--i": 2 + i * 2 } as React.CSSProperties}>
              {e.l.map((ligne, j) => (
                <text key={j} x={x} y={y + j * 15 - (e.l.length - 1) * 7}>
                  {ligne}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ——— les trois vignettes du bloc gris ———
   08/08, deuxième passe. La première version ne posait que des barres grises,
   à la manière d'un squelette de chargement — Teo : « on dirait que c'est pas
   fini, ils affichent rien ». C'était le bon reproche : la référence montre de
   VRAIES captures, avec du texte qu'on peut lire en s'approchant, et c'est ce
   qui les fait lire comme un produit et non comme un gabarit vide.

   Les trois maquettes portent donc du contenu réel — objets de messages,
   étapes du moteur, colonnes de la base. Aucune n'est une capture d'un vrai
   compte : les noms sont fictifs, les montants ronds, et rien de ce qui est
   écrit ne sort d'une base client. Un fondu discret en bas du cadre garde
   l'effet « capture tronquée » de la référence sans manger une ligne. */

const CADRE = "0 0 320 220";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";

function Fenetre({
  titre,
  cle,
  children,
}: {
  titre: string;
  cle: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox={CADRE} fill="none" aria-hidden className="h-auto w-full">
      <defs>
        <linearGradient id={`vd-fondu-${cle}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="72%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#f2f2f2" stopOpacity="0.92" />
        </linearGradient>
        <clipPath id={`vd-cadre-${cle}`}>
          <rect x="14" y="10" width="292" height="204" rx="8" />
        </clipPath>
      </defs>

      <rect x="14" y="10" width="292" height="204" rx="8" fill="#ffffff" />
      <g clipPath={`url(#vd-cadre-${cle})`}>
        {/* barre de fenêtre */}
        <rect x="14" y="10" width="292" height="24" fill="#f8f8f8" />
        <line x1="14" y1="34" x2="306" y2="34" stroke="#ededed" strokeWidth="1" />
        <circle cx="27" cy="22" r="2.6" fill="#dcdcdc" />
        <circle cx="36" cy="22" r="2.6" fill="#dcdcdc" />
        <circle cx="45" cy="22" r="2.6" fill="#dcdcdc" />
        <text x="160" y="25" fontSize="7.6" fill="#9a9a9a" textAnchor="middle" fontFamily={MONO}>
          {titre}
        </text>
        {children}
      </g>
      <rect
        x="14"
        y="10"
        width="292"
        height="204"
        rx="8"
        fill={`url(#vd-fondu-${cle})`}
        pointerEvents="none"
      />
      <rect
        x="14.5"
        y="10.5"
        width="291"
        height="203"
        rx="7.5"
        stroke="#e4e4e4"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

/* une boîte mail — expéditeur, objet, heure */
export function MaquetteOutil() {
  const dossiers = [
    ["Réception", "12"],
    ["Envoyés", ""],
    ["Brouillons", "3"],
    ["Archivés", ""],
  ];
  const messages = [
    ["Cabinet Léger", "Facture 2026-0412 : toujours pas réglée", "09:14"],
    ["Marie Sylvestre", "Demande de devis, chantier Baie-Mahault", "08:52"],
    ["SARL Bois du Nord", "Relance n° 2 : échéance dépassée", "hier"],
    ["Atelier Cadet", "Confirmation du rendez-vous de jeudi", "hier"],
  ];
  return (
    <Fenetre titre="boîte mail" cle="outil">
      {/* colonne des dossiers */}
      <rect x="14" y="34" width="78" height="180" fill="#fbfbfb" />
      <line x1="92" y1="34" x2="92" y2="214" stroke="#eeeeee" strokeWidth="1" />
      {dossiers.map(([nom, n], i) => (
        <g key={nom}>
          {i === 0 && <rect x="20" y={44 + i * 21} width="66" height="17" rx="4" fill="#eeeeee" />}
          <text x="26" y={56 + i * 21} fontSize="7.8" fill={i === 0 ? "#3f3f3f" : "#9e9e9e"}>
            {nom}
          </text>
          {n && (
            <text x="80" y={56 + i * 21} fontSize="7" fill="#b0b0b0" textAnchor="end">
              {n}
            </text>
          )}
        </g>
      ))}

      {/* liste des messages */}
      {messages.map(([de, objet, h], i) => (
        <g key={de} className="vd-ap" style={{ "--i": i } as React.CSSProperties}>
          <rect x="102" y={45 + i * 42} width="8" height="8" rx="2" fill="#ececec" />
          <text x="118" y={52 + i * 42} fontSize="8.2" fill="#2f2f2f">
            {de}
          </text>
          <text x="298" y={52 + i * 42} fontSize="7" fill="#b0b0b0" textAnchor="end">
            {h}
          </text>
          <text x="118" y={65 + i * 42} fontSize="7.6" fill="#9e9e9e">
            {objet}
          </text>
          <line
            x1="102"
            y1={76 + i * 42}
            x2="298"
            y2={76 + i * 42}
            stroke="#f2f2f2"
            strokeWidth="1"
          />
        </g>
      ))}
    </Fenetre>
  );
}

/* l'enchaînement du moteur — cinq étapes nommées */
export function MaquetteMoteur() {
  const hauts = [
    { x: 26, l: "Nouveau mail" },
    { x: 118, l: "Lire le champ" },
    { x: 210, l: "Rédiger" },
  ];
  const bas = [
    { x: 118, l: "Vous validez" },
    { x: 210, l: "Écrire en base" },
  ];
  const L = 80;
  const H = 30;
  const y1 = 60;
  const y2 = 132;

  const Noeud = ({ x, y, l, i }: { x: number; y: number; l: string; i: number }) => (
    <g className="vd-ap" style={{ "--i": i } as React.CSSProperties}>
      <rect x={x} y={y} width={L} height={H} rx="7" fill="#ffffff" stroke="#e0e0e0" />
      <rect x={x + 8} y={y + 10} width="10" height="10" rx="3" fill="#ebebeb" />
      <text x={x + 23} y={y + 18.6} fontSize="7.4" fill="#3f3f3f">
        {l}
      </text>
    </g>
  );

  return (
    <Fenetre titre="moteur" cle="moteur">
      {/* les liaisons, tracées avant les nœuds pour passer dessous */}
      <g stroke="#dadada" strokeWidth="1.2" fill="none" strokeLinecap="round">
        {["M106 75h12", "M198 75h12", "M66 90v27a8 8 0 008 8h44", "M198 147h12"].map((d, i) => (
          <path
            key={d}
            className="vd-trace"
            style={{ "--i": i + 1 } as React.CSSProperties}
            pathLength={1}
            d={d}
          />
        ))}
      </g>
      {hauts.map((n, i) => (
        <Noeud key={n.l} x={n.x} y={y1} l={n.l} i={i} />
      ))}
      {bas.map((n, i) => (
        <Noeud key={n.l} x={n.x} y={y2} l={n.l} i={3 + i} />
      ))}
      <text
        className="vd-ap"
        style={{ "--i": 6 } as React.CSSProperties}
        x="26"
        y="185"
        fontSize="7"
        fill="#b0b0b0"
        fontFamily={MONO}
      >
        5 étapes · 1 seule écrit
      </text>
    </Fenetre>
  );
}

/* la base — une vraie table, colonnes nommées et valeurs plausibles */
export function MaquetteBase() {
  const cols: { t: string; x: number; fin?: boolean }[] = [
    { t: "client", x: 26 },
    { t: "montant", x: 132, fin: true },
    { t: "échéance", x: 200 },
    { t: "état", x: 256 },
  ];
  const lignes = [
    ["Cabinet Léger", "1 240 €", "12/08", "relancé"],
    ["Marie Sylvestre", "480 €", "18/08", "en attente"],
    ["SARL Bois du Nord", "3 900 €", "02/08", "relancé"],
    ["Atelier Cadet", "760 €", "25/08", "payé"],
    ["Ets Rémy & Fils", "2 150 €", "29/08", "en attente"],
  ];
  const teinte: Record<string, string> = {
    relancé: "#b98a3e",
    "en attente": "#8a8a8a",
    payé: "#3f8f62",
  };

  return (
    <Fenetre titre="base · eu-central-1" cle="base">
      {/* en-tête de colonnes */}
      {cols.map((c) => (
        <text
          key={c.t}
          x={c.x}
          y="51"
          fontSize="6.8"
          fill="#a5a5a5"
          fontFamily={MONO}
          textAnchor={c.fin ? "end" : "start"}
        >
          {c.t}
        </text>
      ))}
      <line x1="20" y1="58" x2="300" y2="58" stroke="#e6e6e6" strokeWidth="1" />

      {lignes.map((l, r) => {
        const y = 58 + r * 25;
        return (
          <g key={l[0]} className="vd-ap" style={{ "--i": r } as React.CSSProperties}>
            {r % 2 === 1 && <rect x="20" y={y} width="280" height="25" fill="#fafafa" />}
            <text x="26" y={y + 16} fontSize="7.6" fill="#2f2f2f">
              {l[0]}
            </text>
            <text
              x="132"
              y={y + 16}
              fontSize="7.6"
              fill="#2f2f2f"
              textAnchor="end"
              fontFamily={MONO}
            >
              {l[1]}
            </text>
            <text x="200" y={y + 16} fontSize="7.4" fill="#8a8a8a" fontFamily={MONO}>
              {l[2]}
            </text>
            <circle cx="259" cy={y + 13} r="2.4" fill={teinte[l[3]]} />
            <text x="266" y={y + 16} fontSize="7.2" fill="#6f6f6f">
              {l[3]}
            </text>
            <line x1="20" y1={y + 25} x2="300" y2={y + 25} stroke="#f1f1f1" strokeWidth="1" />
          </g>
        );
      })}
    </Fenetre>
  );
}
