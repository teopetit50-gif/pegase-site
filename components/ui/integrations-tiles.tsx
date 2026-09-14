import {
  siAirtable,
  siGmail,
  siGoogledrive,
  siGooglesheets,
  siNotion,
  siQuickbooks,
  siSage,
  siWhatsapp,
} from "simple-icons";

/* ══════════════════════════════════════════════════════════════════════
   integrations-tiles — le damier de tuiles clairsemé (14/09/2026)

   Reprise de `integrations-4-2` de @efferd (21st.dev) : un carré de 5 × 5
   cases dont une sur deux porte un logo, le reste vide, le tout fondu sur
   les bords par un masque radial — un « nuage » d'outils qui tient dans
   une grille plutôt que de flotter.

   Remplace DEUX sections de /offres/sur-mesure d'un coup : le bandeau
   « SUR MESURE se branche sur ce que vous tenez déjà » (logos défilants)
   et la grille « Intégrations » (trois pistes de pastilles rondes à
   contresens) — 28 marques, deux fois, sur 700 px, pour dire une seule
   chose. Le sur-mesure ne se branche pas sur une liste fermée ; huit
   marques suffisent à montrer la famille, le texte à gauche dit le reste.

   Quatre écarts avec l'original :

   1. LES CASES SONT EN POURCENTAGE, PAS EN 72 PX. Le carré d'origine
      fait 360 px fixes ; à 390 px de large la colonne n'en a que 342. Le
      carré prend `width: 100%; max-width: 360px; aspect-ratio: 1`, et
      chaque case `20 % × 20 %` — il rétrécit sans changer de dessin.
   2. LES LOGOS VIENNENT DE `simple-icons`, DÉJÀ INSTALLÉ, pas de data-URI
      recopiés. Même source que `components/offres/MediaMoteurs.tsx`, même
      règle : les outils du CLIENT, jamais les nôtres (n8n est exclu
      depuis le 14/08).
   3. LES TUILES DE MARQUE RESTENT BLANCHES sur le noir — c'est la règle
      de `.offres--sombre` pour `.o-tuile` (« c'est leur contraste avec
      le fond qui les fait exister »). Les cases vides prennent `--o-soft`
      et un filet `--o-line`.
   4. `cn()` et `dark:invert` retirés : un seul monde, pas de bascule.
   ══════════════════════════════════════════════════════════════════════ */

type Marque = { path: string; title: string; hex: string };

type Tuile = { l: number; c: number; marque?: Marque };

/* la disposition de l'original, marque par marque — les vides comptent
   autant que les pleins pour le dessin */
const TUILES: Tuile[] = [
  { l: 0, c: 1 },
  { l: 0, c: 3, marque: siGmail },
  { l: 1, c: 0 },
  { l: 1, c: 2, marque: siGooglesheets },
  { l: 1, c: 4, marque: siNotion },
  { l: 2, c: 1, marque: siWhatsapp },
  { l: 2, c: 3, marque: siQuickbooks },
  { l: 3, c: 0 },
  { l: 3, c: 2, marque: siGoogledrive },
  { l: 3, c: 4, marque: siSage },
  { l: 4, c: 1, marque: siAirtable },
  { l: 4, c: 3 },
];

export function IntegrationsTiles() {
  return (
    <div
      className="relative aspect-square w-full max-w-[360px] [mask-image:radial-gradient(ellipse_at_center,black,black,transparent)]"
      aria-label="Exemples d'outils sur lesquels un système sur mesure se branche"
      role="img"
    >
      {TUILES.map((t) => (
        <div
          key={`${t.l}-${t.c}`}
          className="absolute p-[3px]"
          style={{ left: `${t.c * 20}%`, top: `${t.l * 20}%`, width: "20%", height: "20%" }}
        >
          <div
            className={
              t.marque
                ? "flex h-full w-full items-center justify-center rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_14px_30px_-16px_rgba(0,0,0,0.6)]"
                : "h-full w-full rounded-md border border-[var(--o-line)] bg-[var(--o-soft)]"
            }
            title={t.marque?.title}
          >
            {t.marque ? (
              <svg viewBox="0 0 24 24" className="h-[42%] w-[42%]" role="img" aria-label={t.marque.title} fill={`#${t.marque.hex}`}>
                <path d={t.marque.path} />
              </svg>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
